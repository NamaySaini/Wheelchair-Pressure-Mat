/**
 * PressureMonitorContext
 *
 * Shared state for the entire app:
 *  - BLE connection + live pressure data
 *  - Countdown timer (fires alert when it hits zero)
 *  - Weight-shift detection (CoP analysis on the 16×16 grid)
 *  - Alert lifecycle: idle → alerting → dismissed → shift complete → idle
 */
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import useBLE from '@/hooks/useBLE';

// ── Defaults ──
const DEFAULT_INTERVAL_SEC = 30 * 60; // 30 minutes
const DEFAULT_SHIFT_DURATION_SEC = 5; // how long user must hold forward lean

// ── Alert phases ──
export type AlertPhase =
  | 'idle'       // timer counting down, nothing happening
  | 'alerting'   // timer fired, alert modal is showing
  | 'dismissed'; // user closed modal but hasn't shifted yet — banner mode

// ── Center-of-Pressure helper ──
// Returns normalised Y position [0 = top, 1 = bottom] of center of pressure.
function computeCoPY(data: number[]): number {
  const ROWS = 16;
  const COLS = 16;
  let totalWeight = 0;
  let weightedY = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = data[r * COLS + c] ?? 0;
      totalWeight += v;
      weightedY += v * r;
    }
  }
  if (totalWeight === 0) return 0.5;
  return weightedY / totalWeight / (ROWS - 1); // 0–1
}

// ── Context shape ──
type PressureMonitorValue = {
  // BLE
  pressureData: number[] | null;
  isConnected: boolean;
  isScanning: boolean;
  bleError: string | null;
  scan: () => void;
  disconnect: () => void;
  writeAlertInterval: (ms: number) => Promise<void>;

  // Timer
  secondsLeft: number;
  msLeft: number;
  intervalSec: number;
  setIntervalSec: (sec: number) => void;

  // Shift detection
  shiftDurationRequired: number;           // seconds
  setShiftDurationRequired: (sec: number) => void;
  shiftProgress: number;                   // 0–1, how far through the required shift
  isShiftedForward: boolean;               // true when CoP is in the top half

  // Alert lifecycle
  alertPhase: AlertPhase;
  dismissAlert: () => void;                // user closes the modal → switch to 'dismissed'
  /** Call when shift is fully completed (auto-called internally) */
  _completeShift: () => void;
};

const Ctx = createContext<PressureMonitorValue | null>(null);

export function usePressureMonitor() {
  const value = useContext(Ctx);
  if (!value) throw new Error('usePressureMonitor must be used inside PressureMonitorProvider');
  return value;
}

export function PressureMonitorProvider({ children }: { children: React.ReactNode }) {
  // ── BLE ──
  const ble = useBLE();

  // ── Timer ──
  const [intervalSec, setIntervalSec] = useState(DEFAULT_INTERVAL_SEC);
  const [msLeft, setMsLeft] = useState(DEFAULT_INTERVAL_SEC * 1000);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsLeft = Math.ceil(msLeft / 1000);

  // ── Shift detection ──
  const [shiftDurationRequired, setShiftDurationRequired] = useState(DEFAULT_SHIFT_DURATION_SEC);
  const shiftStartRef = useRef<number | null>(null); // timestamp when forward lean started
  const [shiftProgress, setShiftProgress] = useState(0);
  const [isShiftedForward, setIsShiftedForward] = useState(false);

  // ── Alert lifecycle ──
  const [alertPhase, setAlertPhase] = useState<AlertPhase>('idle');

  // Reset timer when interval changes
  const resetTimer = useCallback(() => {
    setMsLeft(intervalSec * 1000);
    setAlertPhase('idle');
    setShiftProgress(0);
    shiftStartRef.current = null;
  }, [intervalSec]);

  // When intervalSec changes, restart
  useEffect(() => {
    setMsLeft(intervalSec * 1000);
  }, [intervalSec]);

  // ── Tick every 50 ms ──
  useEffect(() => {
    const TICK_MS = 50;
    timerRef.current = setInterval(() => {
      setMsLeft((prev) => {
        if (prev <= TICK_MS) return 0;
        return prev - TICK_MS;
      });
    }, TICK_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Fire alert when timer expires ──
  useEffect(() => {
    if (secondsLeft === 0 && alertPhase === 'idle') {
      setAlertPhase('alerting');
    }
  }, [secondsLeft, alertPhase]);

  // ── Shift detection (runs on every BLE data update) ──
  useEffect(() => {
    if (!ble.pressureData) return;
    // Only track shift when alert is active or dismissed (banner)
    if (alertPhase !== 'alerting' && alertPhase !== 'dismissed') {
      shiftStartRef.current = null;
      setShiftProgress(0);
      setIsShiftedForward(false);
      return;
    }

    const coPY = computeCoPY(ble.pressureData);
    const forward = coPY < 0.4; // top-heavy = shifted forward
    setIsShiftedForward(forward);

    if (forward) {
      const now = Date.now();
      if (!shiftStartRef.current) {
        shiftStartRef.current = now;
      }
      const held = (now - shiftStartRef.current) / 1000;
      const progress = Math.min(1, held / shiftDurationRequired);
      setShiftProgress(progress);

      if (progress >= 1) {
        // Shift complete → reset everything
        resetTimer();
      }
    } else {
      // Lost the lean — reset shift tracking
      shiftStartRef.current = null;
      setShiftProgress(0);
    }
  }, [ble.pressureData, alertPhase, shiftDurationRequired, resetTimer]);

  const dismissAlert = useCallback(() => {
    if (alertPhase === 'alerting') {
      setAlertPhase('dismissed');
    }
  }, [alertPhase]);

  const _completeShift = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const value = useMemo<PressureMonitorValue>(
    () => ({
      pressureData: ble.pressureData,
      isConnected: ble.isConnected,
      isScanning: ble.isScanning,
      bleError: ble.error,
      scan: ble.scan,
      disconnect: ble.disconnect,
      writeAlertInterval: ble.writeAlertInterval,

      secondsLeft,
      msLeft,
      intervalSec,
      setIntervalSec,

      shiftDurationRequired,
      setShiftDurationRequired,
      shiftProgress,
      isShiftedForward,

      alertPhase,
      dismissAlert,
      _completeShift,
    }),
    [
      ble.pressureData, ble.isConnected, ble.isScanning, ble.error,
      ble.scan, ble.disconnect, ble.writeAlertInterval,
      secondsLeft, msLeft, intervalSec,
      shiftDurationRequired, shiftProgress, isShiftedForward,
      alertPhase, dismissAlert, _completeShift,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
