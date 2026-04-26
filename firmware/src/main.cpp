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
const int SAMPLE_INTERVAL_MS = 500; // BLE notify rate
const int PRINT_INTERVAL_MS  = 300; // serial-monitor dump rate

// Set to 1 to generate synthetic patterns (no mat needed). Set to 0 to scan the real matrix.
#define USE_FAKE_DATA 0

// Settling time between channel selects on the CD74HC4067 pair. A few µs is plenty,
// but Velostat + long wiring sometimes benefits from a touch more.
const int MUX_SETTLE_US = 5;

// ── Fake-data pattern timing (milliseconds) ──
uint32_t phaseA_duration_ms = 10000;
uint32_t phaseB_duration_ms = 6000;

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
const int REPOSITION_LED_PIN = D12;

// ── BLE UUIDs ──
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define PRESSURE_CHAR_UUID  "12345678-1234-1234-1234-123456789ab1"
#define CONFIG_CHAR_UUID    "12345678-1234-1234-1234-123456789ab2"

// ── State ──
uint16_t  sensorValues[NUM_ROWS][NUM_COLS];
uint32_t  alertIntervalMs    = 15000;
uint32_t  lastSampleTime     = 0;
uint32_t  lastPrintTime      = 0;
uint32_t  highPressureStart  = 0;
bool      highPressureActive = false;
bool      alertFired         = false;
bool      deviceConnected    = false;

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

void generateFakeData() {
  bool bottomHeavy = isPhaseA();

  for (int row = 0; row < NUM_ROWS; row++) {
    for (int col = 0; col < NUM_COLS; col++) {
      float r = (float)row / (NUM_ROWS - 1);
      float c = (float)col / (NUM_COLS - 1);

      float pressure;
      if (bottomHeavy) {
        float dr1 = (row - 12.0f) / 3.0f;
        float dc1 = (col - 4.0f) / 3.0f;
        float dr2 = (row - 12.0f) / 3.0f;
        float dc2 = (col - 11.0f) / 3.0f;
        float hotspot1 = expf(-(dr1 * dr1 + dc1 * dc1));
        float hotspot2 = expf(-(dr2 * dr2 + dc2 * dc2));
        float base = fmaxf(hotspot1, hotspot2);
        float diffuse = (r > 0.4f) ? 0.2f * (r - 0.4f) / 0.6f : 0.0f;
        pressure = fminf(1.0f, base + diffuse);
      } else {
        float dr1 = (row - 4.0f) / 3.0f;
        float dc1 = (col - 4.0f) / 3.0f;
        float dr2 = (row - 4.0f) / 3.0f;
        float dc2 = (col - 11.0f) / 3.0f;
        float hotspot1 = expf(-(dr1 * dr1 + dc1 * dc1));
        float hotspot2 = expf(-(dr2 * dr2 + dc2 * dc2));
        float base = fmaxf(hotspot1, hotspot2);
        float diffuse = (r < 0.6f) ? 0.2f * (0.6f - r) / 0.6f : 0.0f;
        pressure = fminf(1.0f, base + diffuse);
      }

      float noise = (float)(random(-50, 50)) / 1000.0f;
      pressure = fminf(1.0f, fmaxf(0.0f, pressure + noise));

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

// ── BLE callbacks ──
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* server) override {
    deviceConnected = true;
    Serial.println("BLE client connected");
  }
  void onDisconnect(BLEServer* server) override {
    deviceConnected = false;
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

  if (now - lastPrintTime >= PRINT_INTERVAL_MS) {
    lastPrintTime = now;
    printMatrix();
  }
}
