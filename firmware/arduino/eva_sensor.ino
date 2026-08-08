/**
 * EVA IONI - Soil Sensor Module
 * Bounty #7 - MyZubster Gateway
 * 
 * Invia dati pH, EC, temperatura e umidità a MyZubster via HTTP
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================================
// CONFIGURAZIONE
// ============================================================

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* apiUrl = "http://188.213.161.186:4000/api/sensors/data";

// Pin dei sensori
const int PH_PIN = A0;
const int EC_PIN = A1;
const int TEMP_PIN = A2;
const int MOISTURE_PIN = A3;

// Garden ID (modifica con il tuo)
const char* gardenId = "6a6c7cc43c87dff77383039a";

// Intervallo di invio (millisecondi)
const unsigned long SEND_INTERVAL = 30000; // 30 secondi

// ============================================================
// SETUP
// ============================================================

void setup() {
  Serial.begin(115200);
  
  // Connessione WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ WiFi connesso");
  Serial.print("📡 IP: ");
  Serial.println(WiFi.localIP());
}

// ============================================================
// LOOP
// ============================================================

void loop() {
  static unsigned long lastSend = 0;
  
  if (millis() - lastSend >= SEND_INTERVAL) {
    lastSend = millis();
    
    // Leggi i sensori
    float ph = readPH();
    float ec = readEC();
    float temp = readTemperature();
    float humidity = readMoisture();
    
    // Invia i dati
    sendData(ph, ec, temp, humidity);
  }
  
  delay(1000);
}

// ============================================================
// FUNZIONI SENSORI
// ============================================================

float readPH() {
  int raw = analogRead(PH_PIN);
  return map(raw, 0, 1023, 0, 140) / 10.0; // pH 0-14
}

float readEC() {
  int raw = analogRead(EC_PIN);
  return map(raw, 0, 1023, 0, 500) / 100.0; // EC 0-5.0 mS/cm
}

float readTemperature() {
  int raw = analogRead(TEMP_PIN);
  return map(raw, 0, 1023, -10, 50); // -10°C a 50°C
}

float readMoisture() {
  int raw = analogRead(MOISTURE_PIN);
  return map(raw, 0, 1023, 0, 100); // 0-100%
}

// ============================================================
// INVIO DATI
// ============================================================

void sendData(float ph, float ec, float temp, float humidity) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ WiFi non connesso");
    return;
  }
  
  HTTPClient http;
  http.begin(apiUrl);
  http.addHeader("Content-Type", "application/json");
  
  // Crea il payload JSON
  StaticJsonDocument<200> doc;
  doc["gardenId"] = gardenId;
  doc["ph"] = ph;
  doc["ec"] = ec;
  doc["temperature"] = temp;
  doc["humidity"] = humidity;
  doc["timestamp"] = millis();
  
  String payload;
  serializeJson(doc, payload);
  
  Serial.println("📡 Invio dati...");
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    Serial.print("✅ Dati inviati (");
    Serial.print(httpResponseCode);
    Serial.println(")");
  } else {
    Serial.print("❌ Errore: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
