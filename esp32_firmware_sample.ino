/*
 * EcoPulse IoT - ESP32 Environmental Station Firmware
 *
 * Supported Hardware:
 *  - ESP32 Development Board (ESP32-WROOM-32 or similar)
 *  - DHT22 (Temperature & Humidity) on GPIO 4
 *  - BMP280 / BME280 (Pressure & Temp) on I2C (SDA: GPIO 21, SCL: GPIO 22)
 *  - MQ-135 (Air Quality / CO2) on ADC GPIO 34
 *  - LDR Light Sensor on ADC GPIO 35
 */

#include <WiFi.h>
#include <HTTPClient.h>

// WiFi Configuration
const char* WIFI_SSID     = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// EcoPulse Server Configuration (Use the IP of your computer running server.py)
const char* SERVER_URL    = "http://192.168.1.100:8000/api/telemetry";

// Transmission interval (milliseconds)
const unsigned long SEND_INTERVAL_MS = 2000;
unsigned long lastSendTime = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n[EcoPulse] Connecting to WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\n[EcoPulse] WiFi Connected!");
  Serial.print("[EcoPulse] IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  if (millis() - lastSendTime >= SEND_INTERVAL_MS) {
    lastSendTime = millis();

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(SERVER_URL);
      http.addHeader("Content-Type", "application/json");

      // Replace these mock calculations with actual sensor readings:
      // float temperature = dht.readTemperature();
      // float humidity = dht.readHumidity();
      // float pressure = bme.readPressure() / 100.0F;
      float temperature = 24.2 + (random(0, 20) / 10.0);
      float humidity    = 53.0 + (random(0, 20) / 10.0);
      int aqi           = 42;
      float pm25        = 8.5;
      float pm10        = 14.0;
      int co2           = 560 + random(0, 40);
      float pressure    = 1013.2;
      float noise       = 43.5;
      int light         = 460;

      // Construct JSON payload
      String jsonPayload = "{";
      jsonPayload += "\"temperature\":" + String(temperature, 1) + ",";
      jsonPayload += "\"humidity\":" + String(humidity, 1) + ",";
      jsonPayload += "\"aqi\":" + String(aqi) + ",";
      jsonPayload += "\"pm25\":" + String(pm25, 1) + ",";
      jsonPayload += "\"pm10\":" + String(pm10, 1) + ",";
      jsonPayload += "\"co2\":" + String(co2) + ",";
      jsonPayload += "\"pressure\":" + String(pressure, 1) + ",";
      jsonPayload += "\"noise\":" + String(noise, 1) + ",";
      jsonPayload += "\"light\":" + String(light) + ",";
      jsonPayload += "\"source\":\"ESP32-Hardware\"";
      jsonPayload += "}";

      int httpResponseCode = http.POST(jsonPayload);
      if (httpResponseCode > 0) {
        Serial.printf("[EcoPulse] Sent. HTTP Status: %d\n", httpResponseCode);
      } else {
        Serial.printf("[EcoPulse] Error on sending POST: %s\n", http.errorToString(httpResponseCode).c_str());
      }

      http.end();
    } else {
      Serial.println("[EcoPulse] WiFi disconnected, retrying...");
    }
  }
}
