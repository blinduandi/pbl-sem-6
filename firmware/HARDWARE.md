# Room Manager — Real-World Hardware Build

This document translates the Wokwi simulation in `firmware/diagram.json`
into a physical Arduino Mega 2560 build. The simulator uses idealised
parts (a potentiometer in place of an MQ-2, LEDs in place of relays);
this guide lists the real components and the small wiring differences
that matter when leaving the simulator.

---

## 1. Bill of Materials

| # | Component | Qty | Notes |
|---|-----------|----:|-------|
| 1 | Arduino Mega 2560 (Rev 3) | 1 | Or any 100 % pin-compatible clone |
| 2 | DHT22 / AM2302 temperature + humidity sensor | 1 | 3-pin module already includes a pull-up; use the bare 4-pin part with a separate resistor |
| 3 | MQ-2 gas sensor module | 1 | Pre-assembled board with onboard load resistor + comparator |
| 4 | SSD1306 0.96" OLED, 128×64, I²C, address 0x3C | 1 | 4-pin: VCC / GND / SCL / SDA |
| 5 | SG90 micro servo (or MG90S for more torque) | 1 | Drives the window vent |
| 6 | 5 V relay module, 2-channel, opto-isolated | 1 | One channel for fan, one for humidifier |
| 7 | 12 V PC case fan, 80 mm | 1 | Or any DC fan matched to the relay rating |
| 8 | Ultrasonic humidifier module (USB or 5 V) | 1 | Use a 5 V mini humidifier or a 24 V mist module via the relay |
| 9 | Active piezo buzzer | 1 | Passive piezo also fine — the firmware uses `tone()` |
| 10 | 4.7 kΩ resistor | 1 | DHT22 data-line pull-up (only if using the bare 4-pin DHT22) |
| 11 | 220 Ω resistor | 2 | Status LEDs, optional on the real build |
| 12 | 5 mm LED | 2 | Optional — local status when relays are inside an enclosure |
| 13 | 12 V DC, ≥ 2 A power supply | 1 | Powers the fan; keep the Mega on its own USB / 5 V |
| 14 | 5 V DC, ≥ 1 A power supply | 1 | For the servo — **never share with the Mega's 5 V regulator** |
| 15 | Breadboard + jumper wires, or perfboard + ribbon | 1 set | |
| 16 | Common ground bus | 1 | All grounds tie together |

---

## 2. Pin Map

This is the authoritative pin list. It mirrors the `#define`s at the
top of `sketch.ino`.

| Function | Mega Pin | Component side | Notes |
|---|---|---|---|
| DHT22 data | D7 | DHT22 `DATA` (pin 2) | 4.7 kΩ pull-up to 5 V on the data line |
| MQ-2 analog | A0 | MQ-2 `AOUT` | Use AOUT, not DOUT — firmware reads the analog level |
| Humidifier relay | D5 | Relay IN2 | Active-HIGH (relay LED lights when D5 = HIGH) |
| Fan relay | D6 | Relay IN1 | Active-HIGH |
| Buzzer | D9 | Buzzer `+` | `tone()` uses Timer 2; keep clear of timer-2 PWM (D10 on Uno; not relevant on Mega here) |
| Window servo PWM | D10 | Servo orange/yellow signal | Servo lib uses Timer 5 on Mega — no clash with `tone()` |
| OLED SDA | D20 (SDA) | OLED `SDA` | Hardware I²C — do not move |
| OLED SCL | D21 (SCL) | OLED `SCL` | Hardware I²C — do not move |
| 5 V rail | 5V | DHT22 VCC, OLED VCC, MQ-2 VCC, relay VCC | Mega's onboard regulator can supply ≈ 500 mA total — fine for these |
| Servo 5 V | external 5 V | Servo red | **Do not** power the servo from the Mega 5 V — see §5 |
| Ground | GND (any) | Every component | Common ground tied to external supplies as well |

---

## 3. Wiring Diagram (text)

```
                    +5V (Mega)                      +12V PSU (fan)
                    |                                 |
   DHT22 ───────────┤                                 |
   ├── VCC (red) ───┘                                 |
   ├── DATA (yellow) ── 4.7kΩ pull-up to +5V ── D7    |
   └── GND ─────────────────────────────────── GND    |
                                                      |
   MQ-2 ─── VCC ─── +5V (Mega)                        |
        ├── GND ─── GND                               |
        ├── AOUT ── A0                                |
        └── DOUT ── (not connected)                   |
                                                      |
   OLED ─── VCC ─── +5V                               |
        ├── GND ─── GND                               |
        ├── SDA ─── D20 (SDA)                         |
        └── SCL ─── D21 (SCL)                         |
                                                      |
   Relay module ─── VCC ─── +5V (Mega)                |
                ├── GND ─── GND                       |
                ├── IN1 ─── D6  (FAN)                 |
                └── IN2 ─── D5  (HUMIDIFIER)          |
                  Fan side:  COM ── +12V ── NO ── Fan(+)
                                              Fan(−) ── GND(12V)
                  Humidifier side: same pattern with its own PSU
                                                      |
   Buzzer ── + ── D9                                  |
          └── − ── GND                                |
                                                      |
   Servo (separate 5V supply) ─── red    ── ext +5V   |
                              ├── brown  ── ext GND ─ tied to Mega GND
                              └── orange ── D10
```

---

## 4. Assembly Steps

1. **Power off everything.** Wire the common ground bus first — Mega
   GND, the servo PSU GND, and the relay's switching-side GND must all
   be tied together. The signal grounds and 12 V grounds are separate
   loops but share the same reference.
2. **Bring up the Mega alone.** Plug it in via USB. Confirm the green
   PWR LED. Upload `firmware/sketch.ino` (PlatformIO: `pio run -t
   upload`). Open the serial monitor at 9600 baud — you should see the
   startup banner.
3. **Add the OLED.** With the Mega off, wire SDA/SCL/VCC/GND. Power on.
   You should see "Room Manager — starting…". If it stays blank, check
   the I²C address (default `0x3C`; some panels are `0x3D`).
4. **Add the DHT22.** Wire VCC, GND, DATA → D7, with the 4.7 kΩ pull-up
   between DATA and VCC. The OLED should now show real RH/T values
   instead of the 50.0/22.0 defaults.
5. **Add the MQ-2.** Wire VCC, GND, AOUT → A0. Let it warm up — the
   real MQ-2 takes **24–48 hours of continuous power** to stabilise; in
   the first hour the reading drifts a lot. The simple linear ADC →
   ppm map in the firmware (`GAS_PPM_FULL_SCALE = 1000`) is a
   placeholder and **must be calibrated** against a known reference
   (see §6).
6. **Add the relay module.** Wire IN1 → D6, IN2 → D5, plus VCC/GND. At
   this point the relay clicks should track the firmware's decision
   logic — try blowing on the DHT22 (RH spikes → fan relay clicks at
   60 %, releases at 55 %).
7. **Wire the fan and humidifier through the relay's switched side**
   (COM/NO). Each load gets its own 12 V or 5 V supply — the Mega does
   not source motor current.
8. **Add the buzzer.** D9 → buzzer (+), GND → buzzer (−). Trigger the
   alarm by pulling A0 high (jumper to 5 V momentarily) — the buzzer
   should pulse at ~ 1 Hz.
9. **Add the servo last.** Power it from the **separate 5 V supply**,
   tie its ground to the common bus, signal to D10. Mount the horn so
   that 0° = window closed, 90° = open. The horn rotates whenever the
   fan relay is energised (`state.windowOpen = fanOn || alarmOn`).

---

## 5. Why the Servo Needs Its Own 5 V

An SG90 draws ~ 100 mA at idle and can spike to **600–800 mA** during
movement or stall. The Mega's onboard 5 V regulator is rated for about
500 mA total and is already shared by the OLED, DHT22, MQ-2 and relay
coils. Powering the servo from the Mega will brown-out the rail, reset
the MCU mid-loop, and produce intermittent OLED corruption.

The fix is a small dedicated 5 V supply (a phone charger via USB
breakout works fine). Wire its + to the servo red, its – to the servo
brown, and tie that – to the Mega GND so the PWM signal has a common
reference. Do **not** connect its + to the Mega's 5 V pin.

---

## 6. MQ-2 Calibration

The simulator's potentiometer maps cleanly onto 0–1000 ppm. A real
MQ-2 does not — its response is logarithmic in `Rs/R0`, and `R0` has to
be measured per-sensor in clean air after the 24 h burn-in.

Quick procedure for a rough calibration:

1. Run the sensor in clean indoor air for at least 24 hours.
2. Read the raw ADC value over Serial — that's your `clean_air_raw`.
3. Treat that level as ~ 0 ppm of LPG/CH₄.
4. Pick the alarm threshold experimentally: a lit match held 30 cm
   away should push the value well past it. Adjust `GAS_DANGER_PPM` /
   `GAS_DANGER_OFF_PPM` until the alarm latches on the match and
   releases when the smoke clears.

For a publishable calibration, follow the datasheet's `Rs/R0` curves
and use a logarithmic conversion in `readGas()`. This is out of scope
for the current firmware.

---

## 7. Pull-Up & Decoupling Notes

- **DHT22 pull-up:** 4.7–10 kΩ between DATA and VCC. The 3-pin DHT22
  *modules* already include this; the 4-pin bare sensors do not.
- **OLED:** the 0.96" SSD1306 modules sold for Arduino already have
  4.7 kΩ I²C pull-ups; do not add more.
- **Power decoupling:** put a 100 nF ceramic capacitor across the 5 V
  rail close to the relay module, and a 470 µF electrolytic close to
  the servo's external 5 V supply. Both are insurance against the
  brown-outs that ruin a long demo.

---

## 8. Mechanical: The Window Vent

The servo opens a hinged window flap rather than the building window
itself. A simple build:

1. Cut a rectangular hole in the enclosure wall.
2. Hinge a piece of acrylic or thin MDF along the top edge.
3. Glue the servo horn (or a short push-rod) to the inside face of the
   flap, with the servo body screwed to the enclosure.
4. Set `WINDOW_CLOSED_DEG` and `WINDOW_OPEN_DEG` in `sketch.ino` to
   match your geometry. Most builds use 0° / 90°, but adjust if the
   horn's neutral position points the wrong way.

The Wokwi simulation visualises this as a rotating arm — there is no
actual flap in the simulator, so all you see is the angle change.

---

## 9. Differences from the Wokwi Simulation

| Wokwi part | Real-world replacement |
|---|---|
| `wokwi-potentiometer` on A0 | MQ-2 module's AOUT (with calibration) |
| `wokwi-led` × 2 (FAN, HUM) | 5 V relay module's IN1 / IN2 inputs, driving real loads |
| `wokwi-buzzer` (active) | Active piezo, same wiring |
| `wokwi-servo` | SG90 / MG90S with **separate** 5 V supply |
| `wokwi-dht22` | 4-pin DHT22 + 4.7 kΩ pull-up |
| `wokwi-ssd1306` | SSD1306 0.96" I²C panel, address 0x3C |
| `wokwi-arduino-mega` | Real Mega 2560 |

The firmware itself is identical — no `#ifdef WOKWI` guards. Anything
that runs on the simulator runs on the bench, given the wiring above.
