/**
 * PressureMonitorContext
 *
 * Shared state for the entire app:
 *  - BLE connection + live pressure data
 *  - Session lifecycle (start / end, auto-end, reposition counting)
 *  - Countdown timer (only ticks when a session is active)
 *  - Weight-shift detection + alert-event logging
 *  - 30s derived-metric readings and 5-min raw-grid snapshots to backend
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
import { Alert } from 'react-native';
import useBLE from '@/hooks/useBLE';
import { computeCoPX, computeCoPY, deriveReading } from '@/hooks/useMetrics';
import { backendClient, type SessionSummary } from '@/lib/backend';

// ── Defaults ──
const DEFAULT_INTERVAL_SEC = 30 * 60; // 30 minutes
const DEFAULT_SHIFT_DURATION_SEC = 5; // how long user must hold forward lean

// ── Logging cadence ──
const READING_INTERVAL_MS = 30_000;
const SNAPSHOT_INTERVAL_MS = 5 * 60_000;

// ── Auto-end thresholds ──
const AUTO_END_IDLE_MS = 3 * 60_000; // 3 minutes
const SEATED_PRESSURE_MIN = 0.1;     // normalized: anything above this = seated

// ── Reposition detection ──
const REPOSITION_DISPLACEMENT = 0.25; // CoP displacement threshold (normalized)
const REPOSITION_SUSTAINED_MS = 3_000;

// ── Firmware CONFIG (mute LED between sessions) ──
const FIRMWARE_MUTE_MS = 0xffffffff; // ~49 days, effectively disabled

// ── Alert phases ──
export type AlertPhase =
  | 'idle'       // timer counting down, nothing happening
  | 'alerting'   // timer fired, alert modal is showing
  | 'dismissed'; // user closed modal but hasn't shifted yet — banner mode

export type EndedReason = 'user' | 'no_pressure' | 'ble_disconnect';

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

  // Session lifecycle
  activeSessionId: string | null;
  sessionStartedAt: number | null;
  isSessionStarting: boolean;
  isSessionEnding: boolean;
  lastSessionSummary: SessionSummary | null;
  startSession: () => Promise<void>;
  endSession: (reason?: EndedReason) => Promise<void>;
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
  const currentAlertIdRef = useRef<string | null>(null);

  // ── Session ──
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null); // mirror for effects that need stable read
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [isSessionStarting, setIsSessionStarting] = useState(false);
  const [isSessionEnding, setIsSessionEnding] = useState(false);
  const [lastSessionSummary, setLastSessionSummary] = useState<SessionSummary | null>(null);

  // ── Refs for logging / auto-end ──
  const lastReadingSentRef = useRef<number>(0);
  const lastSnapshotSentRef = useRef<number>(0);
  const lastSeatedAtRef = useRef<number>(0);
  const lastBleSeenAtRef = useRef<number>(0);

  // ── Reposition detection ──
  const copHistoryRef = useRef<Array<{ t: number; x: number; y: number }>>([]);
  const repositionCountRef = useRef<number>(0);

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  // Reset timer (called on shift complete OR session start)
  const resetTimer = useCallback(() => {
    setMsLeft(intervalSec * 1000);
    setAlertPhase('idle');
    setShiftProgress(0);
    shiftStartRef.current = null;
    currentAlertIdRef.current = null;
  }, [intervalSec]);

  // When intervalSec changes while idle, restart the countdown visually.
  useEffect(() => {
    if (!activeSessionId) {
      setMsLeft(intervalSec * 1000);
    }
  }, [intervalSec, activeSessionId]);

  // ── Tick every 50 ms (only while session active) ──
  useEffect(() => {
    const TICK_MS = 50;
    timerRef.current = setInterval(() => {
      if (!activeSessionIdRef.current) return; // no session → frozen
      setMsLeft((prev) => {
        if (prev <= TICK_MS) return 0;
        return prev - TICK_MS;
      });
    }, TICK_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Fire alert when timer expires (and log event) ──
  useEffect(() => {
    if (!activeSessionId) return;
    if (secondsLeft !== 0 || alertPhase !== 'idle') return;
    setAlertPhase('alerting');
    // Create alert_event row
    backendClient
      .createAlertEvent(activeSessionId)
      .then((r) => {
        currentAlertIdRef.current = r.id;
      })
      .catch((e) => console.warn('createAlertEvent failed:', e.message));
  }, [secondsLeft, alertPhase, activeSessionId]);

  // ── Shift detection (runs on every BLE data update) ──
  useEffect(() => {
    if (!ble.pressureData) return;

    // Touch "last seen" timestamps (used by auto-end watcher)
    const now = Date.now();
    lastBleSeenAtRef.current = now;
    let maxPressure = 0;
    for (let i = 0; i < ble.pressureData.length; i++) {
      if (ble.pressureData[i] > maxPressure) maxPressure = ble.pressureData[i];
    }
    if (maxPressure > SEATED_PRESSURE_MIN) lastSeatedAtRef.current = now;

    // Reposition tracking (regardless of alert phase, as long as session is active)
    if (activeSessionId) {
      const x = computeCoPX(ble.pressureData);
      const y = computeCoPY(ble.pressureData);
      copHistoryRef.current.push({ t: now, x, y });
      // Prune history older than 5 seconds
      copHistoryRef.current = copHistoryRef.current.filter((h) => now - h.t <= 5_000);
      // Find entry closest to REPOSITION_SUSTAINED_MS ago
      const oldEnough = copHistoryRef.current.find(
        (h) => now - h.t >= REPOSITION_SUSTAINED_MS
      );
      if (oldEnough) {
        const dx = x - oldEnough.x;
        const dy = y - oldEnough.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist >= REPOSITION_DISPLACEMENT) {
          repositionCountRef.current += 1;
          copHistoryRef.current = []; // debounce
        }
      }
    }

    // Only track forward-shift when alert is active or dismissed
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
      if (!shiftStartRef.current) shiftStartRef.current = now;
      const held = (now - shiftStartRef.current) / 1000;
      const progress = Math.min(1, held / shiftDurationRequired);
      setShiftProgress(progress);

      if (progress >= 1) {
        // Shift completed — patch the alert_event and reset timer
        if (currentAlertIdRef.current) {
          const id = currentAlertIdRef.current;
          backendClient
            .patchAlertEvent(id, { shift_completed: true })
            .catch((e) => console.warn('patchAlertEvent (shift) failed:', e.message));
        }
        resetTimer();
      }
    } else {
      shiftStartRef.current = null;
      setShiftProgress(0);
    }
  }, [ble.pressureData, alertPhase, shiftDurationRequired, resetTimer, activeSessionId]);

  // ── Reading logger (every 30s during phase-1 idle) ──
  useEffect(() => {
    if (!activeSessionId || !ble.pressureData) return;
    if (alertPhase !== 'idle') return;
    const now = Date.now();
    if (now - lastReadingSentRef.current < READING_INTERVAL_MS) return;
    lastReadingSentRef.current = now;

    const derived = deriveReading(ble.pressureData);
    backendClient
      .postReading({ session_id: activeSessionId, ...derived })
      .catch((e) => console.warn('postReading failed:', e.message));
  }, [ble.pressureData, activeSessionId, alertPhase]);

  // ── Snapshot logger (every 5 min during active session) ──
  useEffect(() => {
    if (!activeSessionId || !ble.pressureData) return;
    const now = Date.now();
    if (now - lastSnapshotSentRef.current < SNAPSHOT_INTERVAL_MS) return;
    lastSnapshotSentRef.current = now;

    // Backend expects 0..4095 ints — our pressureData is normalized [0,1].
    const grid = ble.pressureData.map((v) => Math.round(v * 4095));
    backendClient
      .postSnapshot(activeSessionId, grid)
      .catch((e) => console.warn('postSnapshot failed:', e.message));
  }, [ble.pressureData, activeSessionId]);

  const dismissAlert = useCallback(() => {
    if (alertPhase === 'alerting') {
      setAlertPhase('dismissed');
      if (currentAlertIdRef.current) {
        const id = currentAlertIdRef.current;
        backendClient
          .patchAlertEvent(id, { acknowledged: true })
          .catch((e) => console.warn('patchAlertEvent (ack) failed:', e.message));
      }
    }
  }, [alertPhase]);

  const _completeShift = useCallback(() => {
    if (currentAlertIdRef.current) {
      const id = currentAlertIdRef.current;
      backendClient
        .patchAlertEvent(id, { shift_completed: true })
        .catch((e) => console.warn('patchAlertEvent (shift) failed:', e.message));
    }
    resetTimer();
  }, [resetTimer]);

  // ── Session lifecycle ──
  const startSession = useCallback(async () => {
    if (activeSessionIdRef.current || isSessionStarting) return;
    setIsSessionStarting(true);
    try {
      console.log('startSession ->', backendClient.getBaseUrl());
      const { id, started_at } = await backendClient.startSession();
      setActiveSessionId(id);
      setSessionStartedAt(new Date(started_at).getTime());
      setLastSessionSummary(null);

      // Reset logging / state
      lastReadingSentRef.current = 0;
      lastSnapshotSentRef.current = 0;
      lastSeatedAtRef.current = Date.now();
      lastBleSeenAtRef.current = Date.now();
      copHistoryRef.current = [];
      repositionCountRef.current = 0;
      resetTimer();

      // Unmute the firmware LED alert
      if (ble.isConnected) {
        ble
          .writeAlertInterval(intervalSec * 1000)
          .catch((e) => console.warn('writeAlertInterval (start) failed:', e.message));
      }
    } catch (e: any) {
      console.warn('startSession failed:', e.message);
      Alert.alert(
        'Start Session Failed',
        `Backend: ${backendClient.getBaseUrl() || '(missing)'}\n\n${e?.message ?? 'Unknown error'}`
      );
    } finally {
      setIsSessionStarting(false);
    }
  }, [ble, intervalSec, isSessionStarting, resetTimer]);

  const endSession = useCallback(
    async (reason: EndedReason = 'user') => {
      const id = activeSessionIdRef.current;
      if (!id || isSessionEnding) return;
      setIsSessionEnding(true);
      try {
        const res = await backendClient.endSession(id, {
          auto_ended: reason !== 'user',
          ended_reason: reason,
          repositions_detected: repositionCountRef.current,
        });
        setLastSessionSummary(res.summary);
        // Mute firmware LED alert until next session
        if (ble.isConnected) {
          ble
            .writeAlertInterval(FIRMWARE_MUTE_MS)
            .catch((e) => console.warn('writeAlertInterval (end) failed:', e.message));
        }
      } catch (e: any) {
        console.warn('endSession failed:', e.message);
      } finally {
        setActiveSessionId(null);
        setSessionStartedAt(null);
        setAlertPhase('idle');
        setShiftProgress(0);
        shiftStartRef.current = null;
        currentAlertIdRef.current = null;
        copHistoryRef.current = [];
        repositionCountRef.current = 0;
        setMsLeft(intervalSec * 1000);
        setIsSessionEnding(false);
      }
    },
    [ble, intervalSec, isSessionEnding]
  );

  // ── Auto-end watcher (runs every 30s) ──
  useEffect(() => {
    const iv = setInterval(() => {
      if (!activeSessionIdRef.current) return;
      const now = Date.now();
      if (!ble.isConnected && now - lastBleSeenAtRef.current > AUTO_END_IDLE_MS) {
        endSession('ble_disconnect');
        return;
      }
      if (now - lastSeatedAtRef.current > AUTO_END_IDLE_MS) {
        endSession('no_pressure');
      }
    }, 30_000);
    return () => clearInterval(iv);
  }, [ble.isConnected, endSession]);

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

      activeSessionId,
      sessionStartedAt,
      isSessionStarting,
      isSessionEnding,
      lastSessionSummary,
      startSession,
      endSession,
    }),
    [
      ble.pressureData, ble.isConnected, ble.isScanning, ble.error,
      ble.scan, ble.disconnect, ble.writeAlertInterval,
      secondsLeft, msLeft, intervalSec,
      shiftDurationRequired, shiftProgress, isShiftedForward,
      alertPhase, dismissAlert, _completeShift,
      activeSessionId, sessionStartedAt, isSessionStarting, isSessionEnding,
      lastSessionSummary, startSession, endSession,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
