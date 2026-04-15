#include <Arduino.h>
#include <NimBLEDevice.h>

// ── Grid dimensions ──
const int NUM_ROWS = 16;
const int NUM_COLS = 16;
const int TOTAL_SENSORS = NUM_ROWS * NUM_COLS;

// ── Timing ──
const int SAMPLE_INTERVAL_MS = 500; // BLE notify rate

// ── Fake-data pattern timing (milliseconds) ──
// Phase A: pressure on bottom half (ischial / sitting back)
// Phase B: pressure on top half (leaning forward)
uint32_t phaseA_duration_ms = 5000;  // how long to hold bottom-heavy pattern
uint32_t phaseB_duration_ms = 5000;  // how long to hold top-heavy pattern

// ── Alert ──
const int ALERT_THRESHOLD = 2500;

// ── Hardware pins (unused in fake mode, kept for easy switch-back) ──
const int DEMUX_S0 = D0;
const int DEMUX_S1 = D1;
const int DEMUX_S2 = D2;
const int DEMUX_S3 = D3;
const int MUX_S0   = D4;
const int MUX_S1   = D5;
const int MUX_S2   = D6;
const int MUX_S3   = D7;
const int MUX_SIG  = A6;
const int LED_PIN  = D10;

// ── BLE UUIDs ──
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define PRESSURE_CHAR_UUID  "12345678-1234-1234-1234-123456789ab1"
#define CONFIG_CHAR_UUID    "12345678-1234-1234-1234-123456789ab2"

// ── State ──
uint16_t  sensorValues[NUM_ROWS][NUM_COLS];
uint32_t  alertIntervalMs    = 15000;
uint32_t  lastSampleTime     = 0;
uint32_t  highPressureStart  = 0;
bool      highPressureActive = false;

NimBLEServer*         pServer       = nullptr;
NimBLECharacteristic* pPressureChar = nullptr;
NimBLECharacteristic* pConfigChar   = nullptr;

// ── Fake data generator ──
// Returns true for phase A (bottom-heavy), false for phase B (top-heavy).
bool isPhaseA() {
  uint32_t cycleDuration = phaseA_duration_ms + phaseB_duration_ms;
  uint32_t pos = millis() % cycleDuration;
  return pos < phaseA_duration_ms;
}

void generateFakeData() {
  bool bottomHeavy = isPhaseA();

  for (int row = 0; row < NUM_ROWS; row++) {
    for (int col = 0; col < NUM_COLS; col++) {
      float r = (float)row / (NUM_ROWS - 1);   // 0 = top, 1 = bottom
      float c = (float)col / (NUM_COLS - 1);    // 0 = left, 1 = right

      float pressure;
      if (bottomHeavy) {
        // High pressure on bottom half (rows 8-15), simulating sitting back
        // Two ischial hotspots at ~(row 12, col 4) and ~(row 12, col 11)
        float dr1 = (row - 12.0f) / 3.0f;
        float dc1 = (col - 4.0f) / 3.0f;
        float dr2 = (row - 12.0f) / 3.0f;
        float dc2 = (col - 11.0f) / 3.0f;
        float hotspot1 = expf(-(dr1 * dr1 + dc1 * dc1));
        float hotspot2 = expf(-(dr2 * dr2 + dc2 * dc2));
        float base = fmaxf(hotspot1, hotspot2);
        // Diffuse lower-half pressure
        float diffuse = (r > 0.4f) ? 0.2f * (r - 0.4f) / 0.6f : 0.0f;
        pressure = fminf(1.0f, base + diffuse);
      } else {
        // High pressure on top half (rows 0-7), simulating leaning forward
        // Two thigh hotspots at ~(row 4, col 4) and ~(row 4, col 11)
        float dr1 = (row - 4.0f) / 3.0f;
        float dc1 = (col - 4.0f) / 3.0f;
        float dr2 = (row - 4.0f) / 3.0f;
        float dc2 = (col - 11.0f) / 3.0f;
        float hotspot1 = expf(-(dr1 * dr1 + dc1 * dc1));
        float hotspot2 = expf(-(dr2 * dr2 + dc2 * dc2));
        float base = fmaxf(hotspot1, hotspot2);
        // Diffuse upper-half pressure
        float diffuse = (r < 0.6f) ? 0.2f * (0.6f - r) / 0.6f : 0.0f;
        pressure = fminf(1.0f, base + diffuse);
      }

      // Add a little noise for realism
      float noise = (float)(random(-50, 50)) / 1000.0f;
      pressure = fminf(1.0f, fmaxf(0.0f, pressure + noise));

      // Scale to 12-bit ADC range (0–4095)
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
    if (!highPressureActive) { highPressureActive = true; highPressureStart = now; }
    return (now - highPressureStart) >= alertIntervalMs;
  } else {
    highPressureActive = false;
    return false;
  }
}

void triggerAlert() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH); delay(300);
    digitalWrite(LED_PIN, LOW);  delay(300);
  }
  highPressureActive = false;
}

// ── BLE config write callback ──
class ConfigCallback : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) override {
    std::string val = pChar->getValue();
    if (val.size() == 4) {
      memcpy(&alertIntervalMs, val.data(), 4);
      Serial.printf("Alert interval updated to %u ms\n", alertIntervalMs);
    }
  }
};

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  randomSeed(analogRead(A1));

  Serial.println("--- BLE INIT START ---");
  delay(1000); // let BLE stack settle

  NimBLEDevice::init("PressureMat");
  NimBLEDevice::setMTU(517);
  Serial.println("1. init + MTU OK");

  pServer = NimBLEDevice::createServer();
  NimBLEService* pService = pServer->createService(SERVICE_UUID);
  pPressureChar = pService->createCharacteristic(
    PRESSURE_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  pConfigChar = pService->createCharacteristic(CONFIG_CHAR_UUID, NIMBLE_PROPERTY::WRITE);
  pConfigChar->setCallbacks(new ConfigCallback());
  pService->start();
  Serial.println("2. service started");

  pServer->start();
  Serial.println("3. server started");

  // Simplest possible advertising — just use high-level API
  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setName("PressureMat");
  pAdvertising->enableScanResponse(true);

  bool advOk = pAdvertising->start();
  Serial.printf("4. advertising started: %s\n", advOk ? "YES" : "NO");

  // Print the actual advertising payload size for debug
  Serial.printf("--- BLE INIT DONE (adv=%s) ---\n", advOk ? "OK" : "FAIL");
  Serial.printf("Phase A (bottom-heavy): %u ms\n", phaseA_duration_ms);
  Serial.printf("Phase B (top-heavy):    %u ms\n", phaseB_duration_ms);
}

void loop() {
  uint32_t now = millis();
  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = now;

    // Generate fake alternating pressure pattern instead of reading real sensors
    generateFakeData();

    // Print BLE status every cycle so we can debug
    Serial.printf("--- BLE: server=%s, advertising=%s, connected=%d ---\n",
      pServer ? "OK" : "NULL",
      NimBLEDevice::getAdvertising()->isAdvertising() ? "YES" : "NO",
      pServer->getConnectedCount());

    Serial.printf("[%s] Sensors (sample [0][0]=%d [12][4]=%d):\n",
      isPhaseA() ? "BOTTOM" : "TOP",
      sensorValues[0][0], sensorValues[12][4]);

    if (pServer->getConnectedCount() > 0) {
      pPressureChar->setValue(reinterpret_cast<uint8_t*>(sensorValues), sizeof(sensorValues));
      pPressureChar->notify();
    }

    if (shouldAlert()) triggerAlert();
  }
}
