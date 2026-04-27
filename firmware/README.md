# Firmware (PlatformIO)

This repo supports two PlatformIO environments:

- `seeed_xiao_esp32c3` (ESP32-C3)
- `arduino_nano_esp32` (ESP32-S3)

## Build

```bash
cd firmware
pio run -e seeed_xiao_esp32c3
# or
pio run -e arduino_nano_esp32
```

## Upload

### Seeed XIAO ESP32-C3

```bash
cd firmware
pio run -e seeed_xiao_esp32c3 -t upload
```

### Arduino Nano ESP32 (ESP32-S3)

This project is configured to upload with `upload_protocol = esptool` for the
Nano ESP32 so uploads work over the normal USB CDC serial port.

If you previously saw `dfu-util: No DFU capable USB device available`, that was
PlatformIO trying to use DFU while the board was not in DFU mode.

Upload normally:

```bash
cd firmware
pio run -e arduino_nano_esp32 -t upload
```

If you *want* DFU instead, change `upload_protocol` back to `dfu` and then put
the board into DFU mode (commonly **double-tap RESET**, or hold **BOOT** while
pressing **RESET**; exact sequence depends on board revision).
