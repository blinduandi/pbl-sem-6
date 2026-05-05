#pragma once

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
