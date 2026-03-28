# Wheelchair Pressure Mat

An affordable IoT device + companion app that helps wheelchair users prevent pressure injuries by detecting high-pressure zones and sending periodic reminders to shift weight.

---

## System Architecture

```
[Velostat Mat + Electrodes]
        ↓ analog voltage
[Multiplexer (CD74HC4067)]
        ↓ multiplexed signal
[ESP32-C3 Microcontroller]
    ↓ BLE          ↓ GPIO
[Mobile App]    [LED Alert]
    ↓ HTTP
[Node.js Backend]
    ↓
[Supabase Database]
```

## Folder Structure

```
firmware/    - ESP32-C3 code (Arduino/C++)
app/         - React Native mobile app (iOS + Android)
backend/     - Node.js + Express REST API
```

## Hardware Components

| Component | Purpose |
|---|---|
| Velostat sheet | Pressure-sensitive sensing layer |
| Copper tape | Row/column electrode grid |
| CD74HC4067 Mux | Scan multiple sensor lines with one MCU pin |
| Seeed XIAO ESP32-C3 | Scan sensors + send data over BLE |
| LED / Buzzer | Alert user to shift weight |

## Tech Stack

- **Firmware:** Arduino framework (C++) on ESP32-C3
- **App:** React Native + React Native BLE PLX + React Native SVG
- **Backend:** Node.js + Express
- **Database:** Supabase (PostgreSQL)

## Getting Started

### Firmware
See `firmware/README.md`

### App
```bash
cd app
npm install
npx expo start
```

### Backend
```bash
cd backend
npm install
npm run dev
```
