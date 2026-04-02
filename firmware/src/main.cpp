#include <Arduino.h>
#include <NimBLEDevice.h>

// MUX (reads columns)
const int MUX_S0  = D0;
const int MUX_S1  = D1;
const int MUX_S2  = D2;
const int MUX_S3  = D3;
const int MUX_SIG = A0;

// DEMUX (drives rows)
const int DEMUX_S0 = D4;
const int DEMUX_S1 = D5;
const int DEMUX_S2 = D6;
const int DEMUX_S3 = D7;

const int LED_PIN = D10;

const int ROWS            = 16;
const int COLS            = 16;
const int NUM_SENSORS     = ROWS * COLS; // 256
const int     SAMPLE_INTERVAL_MS = 500; // read all sensors every 500 ms
const int     ALERT_THRESHOLD    = 2500;

#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define PRESSURE_CHAR_UUID  "12345678-1234-1234-1234-123456789ab1"
#define CONFIG_CHAR_UUID    "12345678-1234-1234-1234-123456789ab2"

uint16_t  sensorValues[NUM_SENSORS];
uint32_t  alertIntervalMs    = 15000;
uint32_t  lastSampleTime     = 0;
uint32_t  highPressureStart  = 0;
bool      highPressureActive = false;

NimBLEServer*         pServer       = nullptr;
NimBLECharacteristic* pPressureChar = nullptr;
NimBLECharacteristic* pConfigChar   = nullptr;

void selectDemuxRow(int row) {
  digitalWrite(DEMUX_S0, (row >> 0) & 1);
  digitalWrite(DEMUX_S1, (row >> 1) & 1);
  digitalWrite(DEMUX_S2, (row >> 2) & 1);
  digitalWrite(DEMUX_S3, (row >> 3) & 1);
}

uint16_t readMuxChannel(int channel) {
  digitalWrite(MUX_S0, (channel >> 0) & 1);
  digitalWrite(MUX_S1, (channel >> 1) & 1);
  digitalWrite(MUX_S2, (channel >> 2) & 1);
  digitalWrite(MUX_S3, (channel >> 3) & 1);
  delayMicroseconds(50);
  return (uint16_t)analogRead(MUX_SIG);
}

void readAllSensors() {
  for (int row = 0; row < ROWS; row++) {
    selectDemuxRow(row);
    delayMicroseconds(100); // let the row settle before reading columns
    for (int col = 0; col < COLS; col++) {
      sensorValues[row * COLS + col] = readMuxChannel(col);
    }
  }
}

bool shouldAlert() {
  bool anyHigh = false;
  for (int i = 0; i < NUM_SENSORS; i++) {
    if (sensorValues[i] > ALERT_THRESHOLD) { anyHigh = true; break; }
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

class ConfigCallback : public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar) override {
    std::string val = pChar->getValue();
    if (val.size() == 4) {
      memcpy(&alertIntervalMs, val.data(), 4);
      Serial.printf("Alert interval updated to %u ms\n", alertIntervalMs);
    }
  }
};

void setup() {
  Serial.begin(115200);

  pinMode(MUX_S0, OUTPUT);   pinMode(MUX_S1, OUTPUT);
  pinMode(MUX_S2, OUTPUT);   pinMode(MUX_S3, OUTPUT);
  pinMode(DEMUX_S0, OUTPUT); pinMode(DEMUX_S1, OUTPUT);
  pinMode(DEMUX_S2, OUTPUT); pinMode(DEMUX_S3, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  analogReadResolution(12);

  NimBLEDevice::init("PressureMat");
  NimBLEDevice::setMTU(517); // 512 bytes data + 5 bytes BLE overhead for 256 uint16 readings
  pServer = NimBLEDevice::createServer();

  NimBLEService* pService = pServer->createService(SERVICE_UUID);

  pPressureChar = pService->createCharacteristic(
    PRESSURE_CHAR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );
  pConfigChar = pService->createCharacteristic(CONFIG_CHAR_UUID, NIMBLE_PROPERTY::WRITE);
  pConfigChar->setCallbacks(new ConfigCallback());

  pService->start();
  pServer->getAdvertising()->start();
  Serial.println("BLE advertising started.");
}

void loop() {
  uint32_t now = millis();
  if (now - lastSampleTime >= SAMPLE_INTERVAL_MS) {
    lastSampleTime = now;
    readAllSensors();

    Serial.print("Sensors: ");
    for (int i = 0; i < NUM_SENSORS; i++) Serial.printf("%4d ", sensorValues[i]);
    Serial.println();

    if (pServer->getConnectedCount() > 0) {
      pPressureChar->setValue((uint8_t*)sensorValues, NUM_SENSORS * sizeof(uint16_t));
      pPressureChar->notify();
    }

    if (shouldAlert()) triggerAlert();
  }
}
