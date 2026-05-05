# Room Manager — Real-World Hardware Build

This document describes the physical Arduino Mega 2560 build. The
Wokwi simulation in `firmware/diagram.json` mirrors this hardware
exactly — the only deliberate substitution is a potentiometer in
place of the MQ-2 (so the simulator can sweep gas concentrations
without a real flame).

---

## 1. Bill of Materials

| # | Component | Qty | Notes |
|---|-----------|----:|-------|
| 1 | Arduino Mega 2560 (Rev 3) | 1 | Or any 100 % pin-compatible clone |
| 2 | DHT11 temperature + humidity sensor | 1 | 4-pin module preferred (onboard pull-up); the bare 3-pin part needs an external 4.7–10 kΩ pull-up on DATA |
| 3 | MQ-2 gas sensor module | 1 | Pre-assembled board with onboard load resistor + comparator |
| 4 | 16x2 character LCD with I²C backpack (PCF8574) | 1 | 4 pins: GND, VCC, SDA, SCL. Default address 0x27 — some clones use 0x3F |
| 5 | SG90 micro servo | 1 | Drives the window vent. MG90S works too |
| 6 | 5 mm LED, red | 1 | "FAN" indicator (the project uses an LED in place of a real fan) |
| 7 | 5 mm LED, blue | 1 | "HUM" humidifier indicator |
| 8 | 220 Ω resistor | 2 | Current limiter for each LED |
| 9 | Active piezo buzzer | 1 | Passive piezo also fine — the firmware uses `tone()` |
| 10 | Breadboard + jumper wires | 1 set | Or perfboard + soldered headers |
| 11 | 5 V DC supply, ≥ 1 A (USB phone charger) | 1 | Powers the **servo only** — see §5 |
| 12 | USB-B cable | 1 | Powers + flashes the Mega |

No relays and no separate 12 V supply: the project uses LEDs as
visual stand-ins for the fan and humidifier, so all logic-level
outputs drive LEDs through a 220 Ω resistor.

---

## 2. Pin Map

This is the authoritative pin list. It mirrors the `#define`s at the
top of `sketch.ino`.

| Function | Mega Pin | Component side | Notes |
|---|---|---|---|
| DHT11 data | D7 | DHT11 `DATA` (or pin 2 on bare part) | 4.7 kΩ pull-up to 5 V on the data line if using the 3-pin bare sensor |
| MQ-2 analog | A0 | MQ-2 `AOUT` | Use AOUT, not DOUT — firmware reads the analog level |
| Humidifier LED | D5 | LED anode (via 220 Ω) | LED cathode → GND |
| Fan LED | D6 | LED anode (via 220 Ω) | LED cathode → GND |
| Buzzer | D9 | Buzzer `+` | `tone()` uses Timer 2; no other timer-2 PWM is used |
| Window servo PWM | D10 | Servo orange/yellow signal | Servo lib uses Timer 5 on Mega — no clash with `tone()` |
| LCD SDA | D20 (SDA) | LCD `SDA` | Hardware I²C — do not move |
| LCD SCL | D21 (SCL) | LCD `SCL` | Hardware I²C — do not move |
| 5 V rail | 5V | DHT11 VCC, LCD VCC, MQ-2 VCC | Mega's onboard regulator handles these comfortably |
| Servo 5 V | external 5 V | Servo red | **Do not** power the servo from the Mega 5 V — see §5 |
| Ground | GND (any) | Every component | Common ground tied to the external 5 V supply too |

---

## 3. Wiring Diagram (text)

```
  Mega 5V ─┬── DHT11 VCC
           ├── MQ-2 VCC
           └── LCD VCC

  Mega GND ─┬── DHT11 GND
            ├── MQ-2 GND
            ├── LCD GND
            ├── LED FAN cathode
            ├── LED HUM cathode
            ├── Buzzer (−)
            └── External 5V supply (−)   ← ties the servo PSU into the
                                            same ground reference

  D7  ── DHT11 DATA   (with 4.7 kΩ to 5V if bare sensor)
  A0  ── MQ-2 AOUT
  D20 ── LCD SDA
  D21 ── LCD SCL
  D6  ── 220 Ω ── LED FAN anode
  D5  ── 220 Ω ── LED HUM anode
  D9  ── Buzzer (+)
  D10 ── Servo signal (orange/yellow)

  External 5V (+) ── Servo VCC (red)
  External 5V (−) ── Servo GND (brown) ── Mega GND  (common reference)
```

---

## 4. Assembly Steps

1. **Power off everything.** Wire the common ground bus first — Mega
   GND and the external 5 V PSU GND must be tied together so the
   servo's PWM signal has a proper reference.
2. **Bring up the Mega alone.** Plug it in via USB. Confirm the green
   PWR LED. Upload `firmware/sketch.ino` (PlatformIO: `pio run -t
   upload`). Open the serial monitor at 9600 baud — you should see the
   startup banner and JSON telemetry every 2 s.
3. **Add the LCD.** With the Mega off, wire VCC/GND/SDA/SCL. Power on.
   You should see "Room Manager / v1.4.2-mega". If the backlight is on
   but text is missing, twist the small blue trim-pot on the I²C
   backpack to set contrast. If the screen is fully blank, your panel
   is probably at 0x3F instead of 0x27 — flip `LCD_ADDR` in the sketch.
4. **Add the DHT11.** Wire VCC, GND, DATA → D7. The 4-pin modules
   already include the pull-up. The LCD's first row should now show
   real RH and T values instead of the 50/22 defaults.
5. **Add the MQ-2.** Wire VCC, GND, AOUT → A0. Let it warm up — the
   real MQ-2 takes **24–48 hours of continuous power** to stabilise; in
   the first hour the reading drifts a lot. The simple linear ADC →
   ppm map in the firmware (`GAS_PPM_FULL_SCALE = 1000`) is a
   placeholder and **must be calibrated** against a known reference
   (see §6).
6. **Add the LEDs and resistors.** Each LED gets its anode wired to
   the Mega pin through a 220 Ω resistor; cathode straight to GND.
   FAN on D6, HUM on D5. Breathe on the DHT11 — at >60 % RH the FAN
   LED turns on and stays on until RH drops below 55 % (hysteresis).
7. **Add the buzzer.** D9 → buzzer (+), GND → buzzer (−). Trigger the
   alarm by pulling A0 high (jumper to 5 V momentarily) — the buzzer
   should pulse at ~ 1 Hz.
8. **Add the servo last.** Power it from the **separate 5 V supply**,
   tie its ground to the common bus, signal to D10. Mount the horn so
   that 0° = window closed, 90° = open. The horn rotates whenever the
   FAN LED is on (`state.windowOpen = fanOn || alarmOn`).

---

## 5. Why the Servo Needs Its Own 5 V

An SG90 draws ~ 100 mA at idle and can spike to **600–800 mA** during
movement or stall. The Mega's onboard 5 V regulator is rated for about
500 mA total and is already shared by the LCD, DHT11 and MQ-2.
Powering the servo from the Mega will brown-out the rail, reset the
MCU mid-loop, and produce intermittent LCD corruption.

The fix is a small dedicated 5 V supply (a phone charger via a USB
breakout works fine). Wire its + to the servo red, its − to the servo
brown, and tie that − to the Mega GND so the PWM signal has a common
reference. Do **not** connect its + to the Mega's 5 V pin.

---

## 6. MQ-2 Calibration

The simulator's potentiometer maps cleanly onto 0–1000 ppm. A real
MQ-2 does not — its response is logarithmic in `Rs/R0`, and `R0` has
to be measured per-sensor in clean air after the 24 h burn-in.

Quick procedure for a rough calibration:

1. Run the sensor in clean indoor air for at least 24 hours.
2. Read the raw ADC value over Serial — that's your `clean_air_raw`.
3. Treat that level as ~ 0 ppm of LPG/CH₄.
4. Pick the alarm threshold experimentally: a lit match held 30 cm
   away should push the value well past it. Adjust `GAS_DANGER_PPM`
   and `GAS_DANGER_OFF_PPM` until the alarm latches on the match and
   releases when the smoke clears.

For a publishable calibration, follow the datasheet's `Rs/R0` curves
and use a logarithmic conversion in `readGas()`. This is out of scope
for the current firmware.

---

## 7. Pull-Up & Decoupling Notes

- **DHT11 pull-up:** 4.7–10 kΩ between DATA and VCC. The 4-pin DHT11
  *modules* already include this; the bare 3-pin sensors do not.
- **LCD I²C pull-ups:** the PCF8574 backpack ships with 4.7 kΩ
  pull-ups on SDA/SCL — do not add more.
- **Power decoupling:** put a 100 nF ceramic capacitor across the 5 V
  rail close to the LCD, and a 470 µF electrolytic close to the
  servo's external 5 V supply. Both are insurance against the
  brown-outs that ruin a long demo.

---

## 8. Mechanical: The Window Vent

The servo opens a hinged window flap rather than the building window
itself. A simple build:

1. Cut a rectangular hole in the enclosure wall.
2. Hinge a piece of acrylic or thin MDF along the top edge.
3. Glue the servo horn (or a short push-rod) to the inside face of
   the flap, with the servo body screwed to the enclosure.
4. Set `WINDOW_CLOSED_DEG` and `WINDOW_OPEN_DEG` in `sketch.ino` to
   match your geometry. Most builds use 0° / 90°, but adjust if the
   horn's neutral position points the wrong way.

The Wokwi simulation visualises this as a rotating arm — there is
no actual flap in the simulator, so all you see is the angle change.

---

## 9. LCD Layout

The 16×2 panel shows two fixed rows. The firmware overwrites each
cell instead of calling `lcd.clear()` per render so the screen does
not flicker on every 2 s sample.

```
  col:  0123456789012345
  row 0: T:24 H:60 G:300
  row 1: F:0 H:0 A:0 W:0
```

- `T` — temperature in °C (DHT11 returns integers, so no decimals)
- `H` — relative humidity in %
- `G` — gas reading in ppm (0–1000)
- `F` — fan LED state (0/1)
- `H` — humidifier LED state (0/1)
- `A` — alarm latch (0/1)
- `W` — window servo state (0 closed, 1 open)
- A trailing `*` on row 1 means the last DHT read failed and the
  displayed temperature/humidity are the previous good values.

---

## 10. Differences from the Wokwi Simulation

| Wokwi part | Real-world part |
|---|---|
| `wokwi-potentiometer` on A0 | MQ-2 module's AOUT (with calibration) |
| `wokwi-led` × 2 (FAN, HUM) | 5 mm LEDs through 220 Ω resistors |
| `wokwi-buzzer` | Active piezo, same wiring |
| `wokwi-servo` | SG90 with **separate** 5 V supply |
| `wokwi-dht22` | DHT11 4-pin module — both speak the same single-wire protocol; the firmware uses `DHT11` driver type |
| `wokwi-lcd1602` (I²C mode) | 16x2 LCD with PCF8574 I²C backpack at 0x27 |
| `wokwi-arduino-mega` | Real Mega 2560 |

The firmware itself is identical between simulator and bench — no
`#ifdef WOKWI` shims. Anything that runs on the simulator runs on
the bench, given the wiring above.
