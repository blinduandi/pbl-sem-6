// =====================================================================
// Room Manager — Arduino Mega 2560 firmware
//
// Sense → Decide → Act → Display, exactly as specified in the project
// report. DHT22 + MQ-2 feed an ATmega2560 that drives a fan, humidifier
// and piezo alarm via relay outputs, with hysteresis-based control logic
// and an SSD1306 OLED for local read-out.
//
// This is the standalone build — no Wi-Fi / MQTT (the Mega has no
// wireless on-board). The control loop is self-contained per NFR 9.
//
// Wokwi: the MQ-2 is replaced by a potentiometer; the relays are
// represented by indicator LEDs.
// =====================================================================

#include <Arduino.h>
#include <Wire.h>
#include <DHT.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Servo.h>

// ---- Inlined config (firmware/include/config.h) ----------------------
// =====================================================================
// Room Manager — Arduino Mega 2560 firmware configuration
// Pin map, thresholds (with hysteresis), timing.
//
// Note: the Mega has no Wi-Fi/Bluetooth, so this build implements the
// project's NFR 9 "Standalone Fallback Mode" — sensing, decision,
// actuation, display, alarm. Remote MQTT telemetry is not available
// without an external Wi-Fi shield (e.g. ESP-01 over Serial1).
// =====================================================================

// ---- Pin map (Arduino Mega 2560) -------------------------------------
// DHT22 single-wire data. Needs a 4.7–10 kΩ pull-up to 5 V on real HW.
// Wokwi handles the pull-up internally on the wokwi-dht22 part.
#define PIN_DHT          7

// MQ-2 analog out → A0 (10-bit ADC, 0..1023).
// In Wokwi this pin is driven by a potentiometer that simulates rising
// gas concentration.
#define PIN_GAS          A0

// Relay channel for the ventilation fan. Active-HIGH; flip the level
// in driveActuators() if your relay board is active-LOW.
#define PIN_FAN          6

// Relay channel for the humidifier.
#define PIN_HUMIDIFIER   5

// Piezo buzzer driven by tone() (Timer 2 on the Mega).
// Any digital pin works; pin 9 keeps the buzzer away from the timers
// the Adafruit graphics libraries occasionally touch.
#define PIN_BUZZER       9

// Servo driving the motorised window vent. The Servo library on the
// Mega claims Timer 5 by default, which doesn't collide with tone()
// (Timer 2) or the Wire/Adafruit stack.
#define PIN_WINDOW       10
constexpr int WINDOW_CLOSED_DEG = 0;
constexpr int WINDOW_OPEN_DEG   = 90;

// I²C bus for the SSD1306 OLED uses the Mega's hardware TWI pins:
// SDA = 20, SCL = 21 (no manual definition needed — Wire library
// owns those pins automatically on the Mega).

// ---- Thresholds (hysteresis bands) -----------------------------------
// Match the report exactly: fan 60/55, humidifier 40/45, gas 300/270.
constexpr float HUMIDITY_HIGH      = 60.0f;  // %RH — fan ON
constexpr float HUMIDITY_HIGH_OFF  = 55.0f;  // %RH — fan OFF
constexpr float HUMIDITY_LOW       = 40.0f;  // %RH — humidifier ON
constexpr float HUMIDITY_LOW_OFF   = 45.0f;  // %RH — humidifier OFF
constexpr int   GAS_DANGER_PPM     = 300;    // ppm — alarm ON
constexpr int   GAS_DANGER_OFF_PPM = 270;    // ppm — alarm OFF (~10% below)
constexpr float TEMP_HIGH          = 26.0f;  // °C  — warning only

// MQ-2 analog → ppm scaling for the simulator. The real sensor is
// non-linear (Rs/R0 vs ppm) and needs calibration; here we use a clean
// linear map so the potentiometer span covers the alarm threshold.
// AVR ADC is 10-bit → 0..1023 → 0..1000 ppm.
constexpr int   GAS_PPM_FULL_SCALE = 1000;
constexpr int   ADC_FULL_SCALE     = 1023;

// EMA smoothing factor for the gas reading: new = α·sample + (1−α)·prev.
constexpr float GAS_EMA_ALPHA      = 0.20f;

// ---- Timing ---------------------------------------------------------
constexpr unsigned long SAMPLE_INTERVAL_MS = 2000; // sensor poll
constexpr unsigned long BUZZER_PULSE_MS    = 500;  // alarm beep cadence
constexpr int           BUZZER_FREQ_HZ     = 2200;

// ---- Identity -------------------------------------------------------
#define DEVICE_ID  "rm-living"
#define FW_VERSION "1.4.2-mega"


// ---- Hardware singletons --------------------------------------------
constexpr uint8_t SCREEN_W = 128;
constexpr uint8_t SCREEN_H = 64;

DHT dht(PIN_DHT, DHT22);
Adafruit_SSD1306 display(SCREEN_W, SCREEN_H, &Wire, -1);
Servo windowServo;

// ---- Runtime state --------------------------------------------------
struct State {
  float humidity      = 50.0f;
  float temperature   = 22.0f;
  int   gasPpm        = 0;
  float gasEma        = 0.0f;
  bool  fanOn         = false;
  bool  humidifierOn  = false;
  bool  alarmOn       = false;
  bool  windowOpen    = false;
  bool  dhtValid      = false;
  unsigned long uptimeS = 0;
};

State state;
unsigned long lastSampleAt       = 0;
unsigned long lastBuzzerToggleAt = 0;
bool          buzzerActive       = false;

// Last good sensor values — held when DHT22 returns NaN so the control
// loop never crashes on a single failed read (NFR 6 — Reliability).
float lastValidHumidity = 50.0f;
float lastValidTemp     = 22.0f;

// =====================================================================
// SENSE
// =====================================================================
void readDht() {
  const float h = dht.readHumidity();
  const float t = dht.readTemperature();
  state.dhtValid = !isnan(h) && !isnan(t);
  if (state.dhtValid) {
    lastValidHumidity = h;
    lastValidTemp     = t;
    state.humidity    = h;
    state.temperature = t;
  } else {
    state.humidity    = lastValidHumidity;
    state.temperature = lastValidTemp;
  }
}

void readGas() {
  const int raw = analogRead(PIN_GAS); // 0..1023 on AVR 10-bit ADC
  const int sample = (int)((float)raw * GAS_PPM_FULL_SCALE / ADC_FULL_SCALE);
  // Exponential moving average to suppress sensor noise / cross-sensitivity.
  if (state.gasEma == 0.0f) state.gasEma = (float)sample;
  state.gasEma = GAS_EMA_ALPHA * sample + (1.0f - GAS_EMA_ALPHA) * state.gasEma;
  state.gasPpm = (int)state.gasEma;
}

// =====================================================================
// DECIDE — hysteresis-based control logic (matches report §2.0.1.4)
// =====================================================================
void applyHysteresis() {
  // Fan
  if (!state.fanOn && state.humidity > HUMIDITY_HIGH)               state.fanOn = true;
  else if ( state.fanOn && state.humidity < HUMIDITY_HIGH_OFF)      state.fanOn = false;

  // Humidifier
  if (!state.humidifierOn && state.humidity < HUMIDITY_LOW)         state.humidifierOn = true;
  else if ( state.humidifierOn && state.humidity > HUMIDITY_LOW_OFF) state.humidifierOn = false;

  // Mutual exclusion guard — fan wins (mold/safety > comfort).
  if (state.fanOn && state.humidifierOn) state.humidifierOn = false;

  // Gas alarm
  if (!state.alarmOn && state.gasPpm > GAS_DANGER_PPM)              state.alarmOn = true;
  else if ( state.alarmOn && state.gasPpm < GAS_DANGER_OFF_PPM)     state.alarmOn = false;

  // Force-vent on alarm: get the air moving regardless of RH.
  if (state.alarmOn) state.fanOn = true;

  // Window follows ventilation demand — open whenever the fan runs
  // (high RH) or the gas alarm is latched.
  state.windowOpen = state.fanOn || state.alarmOn;
}

// =====================================================================
// ACT
// =====================================================================
void driveActuators(unsigned long now) {
  digitalWrite(PIN_FAN,        state.fanOn        ? HIGH : LOW);
  digitalWrite(PIN_HUMIDIFIER, state.humidifierOn ? HIGH : LOW);
  windowServo.write(state.windowOpen ? WINDOW_OPEN_DEG : WINDOW_CLOSED_DEG);

  // Buzzer — pulse 50% duty at ~1 Hz while the alarm latch is set.
  if (state.alarmOn) {
    if (now - lastBuzzerToggleAt > BUZZER_PULSE_MS) {
      lastBuzzerToggleAt = now;
      buzzerActive = !buzzerActive;
      if (buzzerActive) tone(PIN_BUZZER, BUZZER_FREQ_HZ);
      else              noTone(PIN_BUZZER);
    }
  } else if (buzzerActive) {
    buzzerActive = false;
    noTone(PIN_BUZZER);
  }
}

// =====================================================================
// DISPLAY
// =====================================================================
void renderDisplay() {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);

  // Header
  display.setCursor(0, 0);
  display.print(F("Room Manager"));
  display.setCursor(96, 0);
  display.print(F("LOCL"));
  display.drawLine(0, 9, SCREEN_W - 1, 9, SSD1306_WHITE);

  // Readings
  display.setCursor(0, 14);
  display.print(F("RH:  "));
  display.print(state.humidity, 1);
  display.print(F(" %"));
  if (!state.dhtValid) display.print(F(" *"));

  display.setCursor(0, 25);
  display.print(F("T:   "));
  display.print(state.temperature, 1);
  display.print((char)247); // ° glyph
  display.print(F("C"));

  display.setCursor(0, 36);
  display.print(F("GAS: "));
  display.print(state.gasPpm);
  display.print(F(" ppm"));

  // Actuators
  display.drawLine(0, 47, SCREEN_W - 1, 47, SSD1306_WHITE);
  display.setCursor(0, 52);
  display.print(F("F:"));
  display.print(state.fanOn ? F("ON") : F("OF"));
  display.print(F(" H:"));
  display.print(state.humidifierOn ? F("ON") : F("OF"));
  display.print(F(" A:"));
  display.print(state.alarmOn ? F("ON") : F("OF"));
  display.print(F(" W:"));
  display.print(state.windowOpen ? F("OP") : F("CL"));

  display.display();
}

// =====================================================================
// SETUP / LOOP
// =====================================================================
void setup() {
  Serial.begin(9600);
  delay(200);
  Serial.println();
  Serial.print(F("=== Room Manager · Mega firmware "));
  Serial.print(F(FW_VERSION));
  Serial.println(F(" ==="));

  // Actuator pins
  pinMode(PIN_FAN, OUTPUT);
  pinMode(PIN_HUMIDIFIER, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_FAN, LOW);
  digitalWrite(PIN_HUMIDIFIER, LOW);

  // Window servo — start closed.
  windowServo.attach(PIN_WINDOW);
  windowServo.write(WINDOW_CLOSED_DEG);

  // OLED
  Wire.begin();
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println(F("[oled] init failed — continuing without display"));
  } else {
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(0, 0);
    display.println(F("Room Manager"));
    display.println(F("starting..."));
    display.print(F("fw "));
    display.println(F(FW_VERSION));
    display.display();
  }

  // Sensors
  dht.begin();
  pinMode(PIN_GAS, INPUT);
}

void loop() {
  const unsigned long now = millis();
  state.uptimeS = now / 1000UL;

  // Sense + decide + render at the sample cadence
  if (now - lastSampleAt >= SAMPLE_INTERVAL_MS) {
    lastSampleAt = now;
    readDht();
    readGas();
    applyHysteresis();
    renderDisplay();

    // JSON line per sample — consumed by the Node serial bridge that
    // forwards readings to the backend's WebSocket.
    Serial.print(F("{\"deviceId\":\"")); Serial.print(F(DEVICE_ID));
    Serial.print(F("\",\"humidity\":"));    Serial.print(state.humidity, 1);
    Serial.print(F(",\"temperature\":"));   Serial.print(state.temperature, 1);
    Serial.print(F(",\"gas\":"));           Serial.print(state.gasPpm);
    Serial.print(F(",\"fanOn\":"));         Serial.print(state.fanOn ? F("true") : F("false"));
    Serial.print(F(",\"humidifierOn\":"));  Serial.print(state.humidifierOn ? F("true") : F("false"));
    Serial.print(F(",\"alarmOn\":"));       Serial.print(state.alarmOn ? F("true") : F("false"));
    Serial.print(F(",\"windowOpen\":"));    Serial.print(state.windowOpen ? F("true") : F("false"));
    Serial.print(F(",\"uptime\":"));        Serial.print(state.uptimeS);
    Serial.println(F("}"));
  }

  // Drive actuators every iteration so the buzzer pulse stays smooth.
  driveActuators(now);
}
