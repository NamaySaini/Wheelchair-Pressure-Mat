# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IoT system for wheelchair pressure injury prevention. A Velostat pressure mat with a 4x4 electrode grid feeds through a CD74HC4067 16-channel multiplexer into an Arduino Nano ESP32. The firmware reads all 16 sensors every 500ms, exposes data via BLE NOTIFY, and triggers an LED alert after sustained high pressure.

Planned but not yet implemented: React Native mobile app (`app/`) and Node.js + Express backend (`backend/`) with Supabase.

## Firmware

**Toolchain:** PlatformIO with Arduino framework targeting `arduino_nano_esp32`.

```bash
# Build
pio run -e arduino_nano_esp32

# Build + upload
pio run -e arduino_nano_esp32 --target upload

# Serial monitor (115200 baud)
pio device monitor
```

**Key constants in `firmware/src/main.cpp`:**
- `ALERT_THRESHOLD` (2500) — ADC value above which a sensor is considered high-pressure (12-bit ADC, range 0–4095)
- `alertIntervalMs` (15000ms default) — how long high pressure must persist before alerting; writable at runtime via BLE CONFIG characteristic

**BLE layout:**
- Service UUID: `12345678-1234-1234-1234-123456789abc`
- `PRESSURE_CHAR` (READ/NOTIFY) — 32-byte payload: 16 × `uint16_t` sensor values, little-endian
- `CONFIG_CHAR` (WRITE) — 4-byte little-endian `uint32_t` to update `alertIntervalMs`

**Hardware pinout:**
| Signal | Pin |
|--------|-----|
| MUX S0–S3 | D0, D1, D2, D3 |
| MUX SIG (analog in) | A0 |
| LED alert | D10 |

## App (planned)

```bash
cd app && npm install && npx expo start
```

## Backend (planned)

```bash
cd backend && npm install && npm run dev
```