#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ── Grid dimensions ──
const int NUM_ROWS = 16;
const int NUM_COLS = 16;
const int TOTAL_SENSORS = NUM_ROWS * NUM_COLS;

// ── Timing ──
const int SAMPLE_INTERVAL_MS = 40; // BLE notify rate
const int PRINT_INTERVAL_MS  = 300; // serial-monitor dump rate

// Set to 1 to generate synthetic patterns (no mat needed). Set to 0 to scan the real matrix.
#define USE_FAKE_DATA 1

// Settling time between channel selects on the CD74HC4067 pair. A few µs is plenty,
// but Velostat + long wiring sometimes benefits from a touch more.
const int MUX_SETTLE_US = 5;

// ── Fake-data pattern timing (milliseconds) ──
uint32_t phaseA_duration_ms = 10000;
uint32_t phaseB_duration_ms = 7000;

const float BASE_PRESSURE_TEMPLATE[NUM_ROWS][NUM_COLS] = {
  {0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f},
  {0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f},
  {0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f},
  {0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f},
  {0.18f,0.18f,0.30f,0.38f,0.30f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.30f,0.40f,0.32f,0.18f,0.18f},
  {0.18f,0.24f,0.42f,0.52f,0.42f,0.24f,0.18f,0.18f,0.18f,0.18f,0.26f,0.44f,0.60f,0.44f,0.24f,0.18f},
  {0.18f,0.32f,0.55f,0.68f,0.55f,0.32f,0.18f,0.18f,0.18f,0.24f,0.42f,0.64f,0.84f,0.64f,0.36f,0.18f},
  {0.30f,0.48f,0.74f,0.86f,0.74f,0.48f,0.30f,0.24f,0.32f,0.48f,0.74f,0.90f,0.98f,0.86f,0.52f,0.30f},
  {0.48f,0.68f,0.90f,0.98f,0.90f,0.68f,0.48f,0.42f,0.48f,0.68f,0.92f,1.00f,1.00f,0.92f,0.68f,0.42f},
  {0.36f,0.56f,0.82f,0.90f,0.82f,0.56f,0.36f,0.56f,0.60f,0.82f,0.98f,1.00f,1.00f,0.98f,0.82f,0.56f},
  {0.18f,0.42f,0.62f,0.82f,0.74f,0.48f,0.30f,0.18f,0.18f,0.42f,0.68f,0.92f,0.86f,0.62f,0.30f,0.18f},
  {0.18f,0.28f,0.48f,0.62f,0.55f,0.36f,0.18f,0.18f,0.18f,0.32f,0.52f,0.68f,0.62f,0.42f,0.24f,0.18f},
  {0.18f,0.18f,0.30f,0.42f,0.36f,0.24f,0.18f,0.18f,0.18f,0.24f,0.36f,0.48f,0.42f,0.30f,0.18f,0.18f},
  {0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f},
  {0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f},
  {0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f,0.18f},
};

// ── Alert ──
const int ALERT_THRESHOLD = 2500;

// ── Hardware pins ──
const int DEMUX_S0 = D6;
const int DEMUX_S1 = D7;
const int DEMUX_S2 = D8;
const int DEMUX_S3 = D9;
const int MUX_S0   = D2;
const int MUX_S1   = D3;
const int MUX_S2   = D4;
const int MUX_S3   = D5;
const int MUX_SIG  = A6;
const int LED_PIN  = D10;
const int REPOSITION_LED_PIN = D13;

// ── BLE UUIDs ──
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define PRESSURE_CHAR_UUID  "12345678-1234-1234-1234-123456789ab1"
#define CONFIG_CHAR_UUID    "12345678-1234-1234-1234-123456789ab2"

// ── State ──
uint16_t  sensorValues[NUM_ROWS][NUM_COLS];
uint32_t  alertIntervalMs    = 15000;
uint32_t  lastSampleTime     = 0;
uint32_t  lastPrintTime      = 0;
uint32_t  lastReminderBlinkTime = 0;
uint32_t  highPressureStart  = 0;
bool      highPressureActive = false;
bool      alertFired         = false;
bool      deviceConnected    = false;
bool      reminderActive     = false;
bool      reminderLedOn      = false;

const uint8_t CONFIG_CMD_SET_INTERVAL = 0x01;
const uint8_t CONFIG_CMD_SET_REMINDER = 0x02;
const uint32_t REMINDER_BLINK_MS = 250;

BLEServer*         pServer       = nullptr;
BLECharacteristic* pPressureChar = nullptr;
BLECharacteristic* pConfigChar   = nullptr;

// ── Matrix scan ──
// The "demux" CD74HC4067 has its SIG pin tied to 3.3V in hardware, so selecting
// a channel drives that row HIGH. The "mux" CD74HC4067 routes one column back
// to MUX_SIG (A6) for the ADC to sample. One row at a time; unselected rows sit
// at high impedance (the CD74HC4067 has 16 analog through-paths and no active
// ground). That's fine for a first pass — if ghosting shows up, revisit with
// column-side pull-downs or an Arduino-driven row line.

inline void selectChannel(int s0, int s1, int s2, int s3, uint8_t channel) {
  digitalWrite(s0, (channel >> 0) & 0x01);
  digitalWrite(s1, (channel >> 1) & 0x01);
  digitalWrite(s2, (channel >> 2) & 0x01);
  digitalWrite(s3, (channel >> 3) & 0x01);
}

void printMatrix() {
  Serial.printf("── matrix (connected=%d) ──\n", deviceConnected ? 1 : 0);
  Serial.print("       ");
  for (int col = 0; col < NUM_COLS; col++) {
    Serial.printf("C%02d  ", col);
  }
  Serial.println();
  for (int row = 0; row < NUM_ROWS; row++) {
    Serial.printf("R%02d | ", row);
    for (int col = 0; col < NUM_COLS; col++) {
      Serial.printf("%4u ", sensorValues[row][col]);
    }
    Serial.println();
  }
  Serial.println("Rows (Rxx) = DEMUX-selected drive lines");
  Serial.println("Cols (Cxx) = MUX-selected read lines");
  Serial.println();
}

void scanMatrix() {
  for (int row = 0; row < NUM_ROWS; row++) {
    selectChannel(DEMUX_S0, DEMUX_S1, DEMUX_S2, DEMUX_S3, row);
    delayMicroseconds(MUX_SETTLE_US);

    for (int col = 0; col < NUM_COLS; col++) {
      selectChannel(MUX_S0, MUX_S1, MUX_S2, MUX_S3, col);
      delayMicroseconds(MUX_SETTLE_US);
      sensorValues[row][col] = (uint16_t)analogRead(MUX_SIG);
    }
  }
}

bool isPhaseA() {
  uint32_t cycleDuration = phaseA_duration_ms + phaseB_duration_ms;
  uint32_t pos = millis() % cycleDuration;
  return pos < phaseA_duration_ms;
}

float lerpFloat(float a, float b, float t) {
  return a + (b - a) * t;
}

float smooth01(float t) {
  t = fminf(1.0f, fmaxf(0.0f, t));
  return t * t * (3.0f - 2.0f * t);
}

float steppedTransition(float t) {
  t = fminf(1.0f, fmaxf(0.0f, t));
  const float steps = 32.0f;
  return roundf(t * steps) / steps;
}

float phaseBlendForTime(uint32_t now) {
  const float transitionMs = 2600.0f;
  const float cycleDuration = (float)(phaseA_duration_ms + phaseB_duration_ms);
  float pos = fmodf((float)now, cycleDuration);

  if (pos < (float)phaseA_duration_ms - transitionMs) return 0.0f;
  if (pos < (float)phaseA_duration_ms) {
    float t = (pos - ((float)phaseA_duration_ms - transitionMs)) / transitionMs;
    return steppedTransition(t);
  }

  pos -= (float)phaseA_duration_ms;
  if (pos < (float)phaseB_duration_ms - transitionMs) return 1.0f;

  float t = (pos - ((float)phaseB_duration_ms - transitionMs)) / transitionMs;
  return 1.0f - steppedTransition(t);
}

float sampleTemplate(float row, float col) {
  float r = fminf((float)(NUM_ROWS - 1), fmaxf(0.0f, row));
  float c = fminf((float)(NUM_COLS - 1), fmaxf(0.0f, col));

  int r0 = (int)floorf(r);
  int c0 = (int)floorf(c);
  int r1 = min(NUM_ROWS - 1, r0 + 1);
  int c1 = min(NUM_COLS - 1, c0 + 1);

  float tr = r - r0;
  float tc = c - c0;

  float v00 = BASE_PRESSURE_TEMPLATE[r0][c0];
  float v01 = BASE_PRESSURE_TEMPLATE[r0][c1];
  float v10 = BASE_PRESSURE_TEMPLATE[r1][c0];
  float v11 = BASE_PRESSURE_TEMPLATE[r1][c1];

  float top = lerpFloat(v00, v01, tc);
  float bot = lerpFloat(v10, v11, tc);
  return lerpFloat(top, bot, tr);
}

float shiftBlendForTime(uint32_t now) {
  const float holdBackMs = 10000.0f;
  const float moveForwardMs = 120.0f;
  const float holdForwardMs = 6000.0f;
  const float moveBackMs = 120.0f;
  const float cycleMs = holdBackMs + moveForwardMs + holdForwardMs + moveBackMs;
  float pos = fmodf((float)now, cycleMs);

  if (pos < holdBackMs) return 0.0f;
  pos -= holdBackMs;
  if (pos < moveForwardMs) return smooth01(pos / moveForwardMs);
  pos -= moveForwardMs;
  if (pos < holdForwardMs) return 1.0f;
  pos -= holdForwardMs;
  return 1.0f - smooth01(pos / moveBackMs);
}

void generateFakeData() {
  uint32_t now = millis();
  uint32_t frame = now / SAMPLE_INTERVAL_MS;
  uint32_t sparkleFrame = now / 180;
  float phaseBlend = phaseBlendForTime(now);

  for (int row = 0; row < NUM_ROWS; row++) {
    for (int col = 0; col < NUM_COLS; col++) {
      float r = (float)row / (NUM_ROWS - 1);
      float pressureBack = 0.18f;
      float pressureForward = 0.18f;

      {
        float dr1 = (row - 12.0f) / 3.0f;
        float dc1 = (col - 3.2f) / 2.9f;
        float dr2 = (row - 12.0f) / 3.0f;
        float dc2 = (col - 11.8f) / 2.9f;
        float hotspot1 = expf(-(dr1 * dr1 + dc1 * dc1));
        float hotspot2 = expf(-(dr2 * dr2 + dc2 * dc2));
        float base = fmaxf(hotspot1, hotspot2);
        float drCenter = (row - 12.2f) / 3.6f;
        float dcCenter = (col - 7.5f) / 2.4f;
        float centerBridge = 0.42f * expf(-(drCenter * drCenter + dcCenter * dcCenter));
        float diffuse = (r > 0.4f) ? 0.2f * (r - 0.4f) / 0.6f : 0.0f;
        pressureBack = fmaxf(0.18f, fminf(1.0f, base + centerBridge + diffuse));
        if (col >= 9 && row >= 8) pressureBack = fminf(1.0f, pressureBack + 0.05f);
      }

      {
        float dr1 = (row - 4.0f) / 3.0f;
        float dc1 = (col - 3.4f) / 2.9f;
        float dr2 = (row - 4.0f) / 3.0f;
        float dc2 = (col - 11.6f) / 2.9f;
        float hotspot1 = expf(-(dr1 * dr1 + dc1 * dc1));
        float hotspot2 = expf(-(dr2 * dr2 + dc2 * dc2));
        float base = fmaxf(hotspot1, hotspot2);
        float drCenter = (row - 4.2f) / 3.3f;
        float dcCenter = (col - 7.5f) / 2.3f;
        float centerBridge = 0.36f * expf(-(drCenter * drCenter + dcCenter * dcCenter));
        float diffuse = (r < 0.6f) ? 0.2f * (0.6f - r) / 0.6f : 0.0f;
        pressureForward = fmaxf(0.18f, fminf(1.0f, base + centerBridge + diffuse));
        if (col >= 9 && row <= 6) pressureForward = fminf(1.0f, pressureForward + 0.04f);
      }

      float pressure = lerpFloat(pressureBack, pressureForward, phaseBlend);

      float hotspotStrength = fminf(1.0f, fmaxf(0.0f, (pressure - 0.34f) / 0.32f));
      float hotspotMask = hotspotStrength * hotspotStrength;
      float pulseWave = 0.5f + 0.5f * sinf((float)now / 190.0f + row * 0.7f + col * 0.4f);
      uint32_t sparkHash = (uint32_t)(row * 73856093u) ^ (uint32_t)(col * 19349663u) ^ (sparkleFrame * 83492791u);
      float sparkChance = lerpFloat(0.24f, 0.28f, phaseBlend);
      bool sparkOn = hotspotStrength > 0.22f && (sparkHash % 100) < (uint32_t)(sparkChance * 100.0f);
      float sparkPulse = sparkOn ? (0.12f + (float)(sparkHash % 9) * 0.012f) * hotspotStrength : 0.0f;
      float sparkle = ((float)((sparkHash >> 8) % 24) / 1000.0f) * hotspotMask;
      float ember = ((row + col + sparkleFrame) % 5 == 0 ? 0.014f : 0.0f) * hotspotMask;
      float midlineMask = expf(-powf((col - 7.5f) / 2.1f, 2.0f)) * expf(-powf((row - lerpFloat(12.0f, 4.0f, phaseBlend)) / 4.0f, 2.0f));
      float midlinePulse = 0.018f * midlineMask * (0.35f + 0.65f * pulseWave);
      float hotspotPulse = hotspotMask * (0.042f * pulseWave + sparkle) + ember + sparkPulse + midlinePulse;
      pressure = fminf(1.0f, pressure + hotspotPulse);

      sensorValues[row][col] = (uint16_t)(pressure * 4095.0f);
    }
  }
}

// ── Alert logic ──
bool shouldAlert() {
  bool anyHigh = false;
  for (int row = 0; row < NUM_ROWS && !anyHigh; row++) {
    for (int col = 0; col < NUM_COLS; col++) {
      if (sensorValues[row][col] > ALERT_THRESHOLD) {
        anyHigh = true;
        break;
      }
    }
  }

  uint32_t now = millis();
  if (anyHigh) {
    if (alertFired) return false; // wait until they release before re-arming
    if (!highPressureActive) { highPressureActive = true; highPressureStart = now; }
    return (now - highPressureStart) >= alertIntervalMs;
  } else {
    highPressureActive = false;
    alertFired = false; // re-armed once pressure is released
    return false;
  }
}

void triggerAlert() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(300);
    digitalWrite(LED_PIN, LOW);
    delay(300);
  }
  highPressureActive = false;
  alertFired = true;
}

void updateReminderLed(uint32_t now) {
  if (!reminderActive) {
    reminderLedOn = false;
    digitalWrite(REPOSITION_LED_PIN, LOW);
    return;
  }

  if (now - lastReminderBlinkTime < REMINDER_BLINK_MS) return;
  lastReminderBlinkTime = now;
  reminderLedOn = !reminderLedOn;
  digitalWrite(REPOSITION_LED_PIN, reminderLedOn ? HIGH : LOW);
}

// ── BLE callbacks ──
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    deviceConnected = true;
    Serial.println("BLE client connected");
  }
  void onDisconnect(BLEServer* server) override {
    deviceConnected = false;
    reminderActive = false;
    reminderLedOn = false;
    digitalWrite(REPOSITION_LED_PIN, LOW);
    Serial.println("BLE client disconnected — restarting advertising");
    BLEDevice::startAdvertising();
  }
};

class ConfigCallback : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pChar) override {
    std::string val = pChar->getValue();
    if (val.size() == 4) {
      memcpy(&alertIntervalMs, val.data(), 4);
      Serial.printf("Alert interval updated to %u ms\n", alertIntervalMs);
      return;
    }

    if (val.size() >= 2) {
      const uint8_t command = static_cast<uint8_t>(val[0]);
      if (command == CONFIG_CMD_SET_INTERVAL && val.size() == 5) {
        memcpy(&alertIntervalMs, val.data() + 1, 4);
        Serial.printf("Alert interval updated to %u ms\n", alertIntervalMs);
      } else if (command == CONFIG_CMD_SET_REMINDER) {
        reminderActive = static_cast<uint8_t>(val[1]) != 0;
        if (!reminderActive) {
          reminderLedOn = false;
          digitalWrite(REPOSITION_LED_PIN, LOW);
        }
        Serial.printf("Reminder LED %s\n", reminderActive ? "enabled" : "disabled");
      }
    }
  }
};

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  pinMode(REPOSITION_LED_PIN, OUTPUT);
  digitalWrite(REPOSITION_LED_PIN, LOW);

  // Select-line outputs for both CD74HC4067s.
  pinMode(DEMUX_S0, OUTPUT);
  pinMode(DEMUX_S1, OUTPUT);
  pinMode(DEMUX_S2, OUTPUT);
  pinMode(DEMUX_S3, OUTPUT);
  pinMode(MUX_S0, OUTPUT);
  pinMode(MUX_S1, OUTPUT);
  pinMode(MUX_S2, OUTPUT);
  pinMode(MUX_S3, OUTPUT);

  // ESP32 ADC is 12-bit by default on Arduino-ESP32 ≥ 2.x, but be explicit.
  analogReadResolution(12);

  randomSeed(analogRead(A1));

  Serial.println("Starting BLE work!");

  BLEDevice::init("PressureMat");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService* pService = pServer->createService(SERVICE_UUID);

  pPressureChar = pService->createCharacteristic(
    PRESSURE_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pPressureChar->addDescriptor(new BLE2902());

  pConfigChar = pService->createCharacteristic(
    CONFIG_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pConfigChar->setCallbacks(new ConfigCallback());

  pService->start();

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // iPhone connection hints
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  Serial.println("Characteristic defined! Now you can read it in your phone!");
  Serial.printf("Phase A (bottom-heavy): %u ms\n", phaseA_duration_ms);
  Serial.printf("Phase B (top-heavy):    %u ms\n", phaseB_duration_ms);
  Serial.printf("USE_FAKE_DATA:          %d\n", USE_FAKE_DATA);
}

void loop() {
  uint32_t now = millis();
  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = now;

#if USE_FAKE_DATA
    generateFakeData();
#else
    scanMatrix();
#endif

    if (deviceConnected) {
      pPressureChar->setValue(reinterpret_cast<uint8_t*>(sensorValues), sizeof(sensorValues));
      pPressureChar->notify();
    }

    if (shouldAlert()) triggerAlert();
  }

  if (!USE_FAKE_DATA && now - lastPrintTime >= PRINT_INTERVAL_MS) {
    lastPrintTime = now;
    printMatrix();
  }

  updateReminderLed(now);
}
