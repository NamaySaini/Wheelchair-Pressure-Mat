/**
 * useBLE — connect to the PressureMat ESP32 and stream live sensor data.
 *
 * Returns:
 *   pressureData  — flat array of 256 normalised [0,1] values (16×16 grid),
 *                   or null when not connected / no data yet
 *   isConnected   — true while subscribed to notifications
 *   isScanning    — true while scanning for devices
 *   error         — last error message, if any
 *   scan          — call to start scanning + auto-connect
 *   disconnect    — call to tear down connection
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import { decode as atob } from 'base-64';

// ── BLE identifiers (must match firmware) ──
const SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
const PRESSURE_CHAR_UUID = '12345678-1234-1234-1234-123456789ab1';
const CONFIG_CHAR_UUID = '12345678-1234-1234-1234-123456789ab2';
const DEVICE_NAME = 'PressureMat';

const GRID_SIZE = 256; // 16 × 16
const ADC_MAX = 4095;

/** Decode base-64 → 256 × uint16 LE → normalised [0,1] */
function decodePayload(base64: string): number[] {
  const raw = atob(base64);
  const values: number[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const lo = raw.charCodeAt(i);
    const hi = raw.charCodeAt(i + 1);
    values.push(((hi << 8) | lo) / ADC_MAX);
  }
  // Pad to GRID_SIZE in case of short payload
  while (values.length < GRID_SIZE) values.push(0);
  return values.slice(0, GRID_SIZE);
}

export default function useBLE() {
  const managerRef = useRef<BleManager | null>(null);
  const deviceRef = useRef<Device | null>(null);
  const subRef = useRef<Subscription | null>(null);

  const [pressureData, setPressureData] = useState<number[] | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazily create the BleManager (only one should exist per app).
  function getManager(): BleManager {
    if (!managerRef.current) {
      managerRef.current = new BleManager();
    }
    return managerRef.current;
  }

  // ── Request permissions (Android) ──
  async function requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') return true;
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(granted).every(
        (v) => v === PermissionsAndroid.RESULTS.GRANTED,
      );
    } catch {
      return false;
    }
  }

  // ── Subscribe to pressure notifications ──
  async function subscribe(device: Device) {
    await device.discoverAllServicesAndCharacteristics();

    subRef.current = device.monitorCharacteristicForService(
      SERVICE_UUID,
      PRESSURE_CHAR_UUID,
      (err, characteristic) => {
        if (err) {
          console.warn('BLE notify error:', err.message);
          setError(err.message);
          setIsConnected(false);
          return;
        }
        if (characteristic?.value) {
          setPressureData(decodePayload(characteristic.value));
        }
      },
    );

    setIsConnected(true);
    setError(null);
  }

  // ── Connect to a discovered device ──
  async function connectToDevice(device: Device) {
    try {
      const connected = await device.connect({ requestMTU: 517 });
      deviceRef.current = connected;

      // Listen for unexpected disconnect
      connected.onDisconnected(() => {
        setIsConnected(false);
        setPressureData(null);
        deviceRef.current = null;
        subRef.current?.remove();
        subRef.current = null;
      });

      await subscribe(connected);
    } catch (e: any) {
      setError(e.message ?? 'Connection failed');
      setIsConnected(false);
    }
  }

  // ── Scan + auto-connect ──
  const scan = useCallback(async () => {
    const mgr = getManager();
    setError(null);

    const permitted = await requestPermissions();
    if (!permitted) {
      setError('Bluetooth permissions not granted');
      return;
    }

    setIsScanning(true);

    mgr.startDeviceScan(null, null, async (err, device) => {
      if (err) {
        setError(err.message);
        setIsScanning(false);
        return;
      }
      if (device?.name === DEVICE_NAME || device?.localName === DEVICE_NAME) {
        mgr.stopDeviceScan();
        setIsScanning(false);
        await connectToDevice(device);
      }
    });

    // Stop scanning after 15 s if nothing found
    setTimeout(() => {
      mgr.stopDeviceScan();
      setIsScanning((prev) => {
        if (prev) setError('PressureMat not found — make sure the ESP32 is on and nearby');
        return false;
      });
    }, 15000);
  }, []);

  // ── Write alert interval to CONFIG characteristic ──
  const writeAlertInterval = useCallback(async (ms: number) => {
    if (!deviceRef.current) return;
    const buf = new ArrayBuffer(4);
    new DataView(buf).setUint32(0, ms, true); // little-endian
    const bytes = new Uint8Array(buf);
    // Encode to base64
    let binary = '';
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    const b64 = btoa(binary);
    await deviceRef.current.writeCharacteristicWithResponseForService(
      SERVICE_UUID,
      CONFIG_CHAR_UUID,
      b64,
    );
  }, []);

  // ── Disconnect ──
  const disconnect = useCallback(async () => {
    subRef.current?.remove();
    subRef.current = null;
    if (deviceRef.current) {
      try {
        await deviceRef.current.cancelConnection();
      } catch { /* already disconnected */ }
      deviceRef.current = null;
    }
    setIsConnected(false);
    setPressureData(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subRef.current?.remove();
      deviceRef.current?.cancelConnection().catch(() => {});
      managerRef.current?.destroy();
      managerRef.current = null;
    };
  }, []);

  return {
    pressureData,
    isConnected,
    isScanning,
    error,
    scan,
    disconnect,
    writeAlertInterval,
  };
}
