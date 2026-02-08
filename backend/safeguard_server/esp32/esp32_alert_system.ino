/*
╔═══════════════════════════════════════════════════════════════╗
║  SAFEGUARD FAMILY - ESP32 ALERT SYSTEM                        ║
║  Physical IoT Alert Device for Parents                        ║
║  Hardware: ESP32 DevKit + Buzzer + LED                        ║
╚═══════════════════════════════════════════════════════════════╝

HARDWARE CONNECTIONS:
- Buzzer: GPIO 25
- Red LED: GPIO 26
- Green LED: GPIO 27
- Button: GPIO 34 (for manual reset)

FUNCTIONALITY:
- Connects to WiFi
- Creates HTTP server
- Listens for alert requests from backend
- Triggers buzzer and LED when harmful site is blocked
- Shows status via serial monitor

IMPORTANT: This is a PARENT-SIDE device, located at home
NOT a tracking device on the child's device
*/

#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION - CHANGE THESE VALUES
// ═══════════════════════════════════════════════════════════════

// WiFi Credentials (Your home WiFi)
const char* WIFI_SSID = "YourWiFiName";        // Change this
const char* WIFI_PASSWORD = "YourWiFiPassword"; // Change this

// Hardware Pin Configuration
const int PIN_BUZZER = 25;     // Buzzer pin
const int PIN_LED_RED = 26;    // Red LED (alert)
const int PIN_LED_GREEN = 27;  // Green LED (status/online)
const int PIN_BUTTON = 34;     // Button for manual reset

// Server Configuration
const int SERVER_PORT = 80;

// Alert Duration
const int BUZZER_DURATION = 3000;  // 3 seconds
const int LED_DURATION = 10000;    // 10 seconds

// ═══════════════════════════════════════════════════════════════
// GLOBAL VARIABLES
// ═══════════════════════════════════════════════════════════════

WebServer server(SERVER_PORT);
bool alertActive = false;
unsigned long alertStartTime = 0;
int totalAlertsReceived = 0;
String lastAlertCategory = "";
String lastAlertChild = "";

// ═══════════════════════════════════════════════════════════════
// SETUP FUNCTION
// ═══════════════════════════════════════════════════════════════

void setup() {
  // Initialize Serial Monitor
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n\n╔════════════════════════════════════════════╗");
  Serial.println("║  SafeGuard Family - ESP32 Alert System  ║");
  Serial.println("╚════════════════════════════════════════════╝\n");
  
  // Initialize Hardware Pins
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  
  // Turn off all outputs initially
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_GREEN, LOW);
  
  Serial.println("[Hardware] Pins initialized");
  
  // Connect to WiFi
  connectToWiFi();
  
  // Setup HTTP Server Routes
  setupServerRoutes();
  
  // Start Server
  server.begin();
  Serial.println("[Server] HTTP server started on port " + String(SERVER_PORT));
  Serial.println();
  Serial.println("═══════════════════════════════════════════════");
  Serial.println("READY TO RECEIVE ALERTS!");
  Serial.println("Backend URL: http://" + WiFi.localIP().toString());
  Serial.println("Update this IP in backend .env file:");
  Serial.println("ESP32_ALERT_URL=http://" + WiFi.localIP().toString() + "/alert");
  Serial.println("═══════════════════════════════════════════════\n");
  
  // Blink green LED to show ready
  blinkStatusLED(3);
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOOP
// ═══════════════════════════════════════════════════════════════

void loop() {
  // Handle incoming HTTP requests
  server.handleClient();
  
  // Check if alert is active and should be turned off
  if (alertActive) {
    unsigned long elapsedTime = millis() - alertStartTime;
    
    // Turn off buzzer after duration
    if (elapsedTime > BUZZER_DURATION) {
      digitalWrite(PIN_BUZZER, LOW);
    }
    
    // Turn off LED after duration
    if (elapsedTime > LED_DURATION) {
      digitalWrite(PIN_LED_RED, LOW);
      alertActive = false;
      Serial.println("[Alert] Alert sequence completed\n");
    }
  }
  
  // Check button press for manual reset/test
  if (digitalRead(PIN_BUTTON) == LOW) {
    delay(50); // Debounce
    if (digitalRead(PIN_BUTTON) == LOW) {
      Serial.println("[Button] Manual test triggered");
      triggerTestAlert();
      delay(500);
    }
  }
  
  // Keep green LED on to show system is online
  digitalWrite(PIN_LED_GREEN, HIGH);
}

// ═══════════════════════════════════════════════════════════════
// WIFI CONNECTION
// ═══════════════════════════════════════════════════════════════

void connectToWiFi() {
  Serial.println("[WiFi] Connecting to: " + String(WIFI_SSID));
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] ✓ Connected!");
    Serial.println("[WiFi] IP Address: " + WiFi.localIP().toString());
    Serial.println("[WiFi] Signal Strength: " + String(WiFi.RSSI()) + " dBm");
  } else {
    Serial.println("\n[WiFi] ✗ Connection failed!");
    Serial.println("[WiFi] Please check credentials and try again");
  }
}

// ═══════════════════════════════════════════════════════════════
// HTTP SERVER ROUTES
// ═══════════════════════════════════════════════════════════════

void setupServerRoutes() {
  
  // Root endpoint - Status page
  server.on("/", HTTP_GET, []() {
    String html = "<!DOCTYPE html><html><head><title>SafeGuard ESP32</title>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>body{font-family:Arial;text-align:center;padding:20px;background:#f4f4f4}";
    html += ".card{background:white;padding:20px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,0.1);max-width:500px;margin:20px auto}";
    html += "h1{color:#333}.status{color:#4CAF50;font-size:24px;font-weight:bold}";
    html += ".stat{margin:15px 0;padding:10px;background:#f9f9f9;border-radius:5px}";
    html += "</style></head><body>";
    html += "<div class='card'>";
    html += "<h1>🛡️ SafeGuard Family</h1>";
    html += "<p class='status'>ESP32 ONLINE</p>";
    html += "<div class='stat'>Total Alerts: " + String(totalAlertsReceived) + "</div>";
    html += "<div class='stat'>Last Category: " + lastAlertCategory + "</div>";
    html += "<div class='stat'>Last Child: " + lastAlertChild + "</div>";
    html += "<div class='stat'>Uptime: " + String(millis() / 1000) + "s</div>";
    html += "<p style='margin-top:20px;color:#666'>Status: Active and monitoring</p>";
    html += "</div></body></html>";
    
    server.send(200, "text/html", html);
  });
  
  // Alert endpoint - Receives alerts from backend
  server.on("/alert", HTTP_POST, handleAlertRequest);
  
  // Ping endpoint - Connection test
  server.on("/ping", HTTP_GET, []() {
    server.send(200, "application/json", "{\"status\":\"online\",\"device\":\"esp32\"}");
  });
  
  // Test buzzer endpoint
  server.on("/test/buzzer", HTTP_GET, []() {
    triggerBuzzer(1000);
    server.send(200, "application/json", "{\"status\":\"buzzer tested\"}");
  });
  
  // Test LED endpoint
  server.on("/test/led", HTTP_GET, []() {
    digitalWrite(PIN_LED_RED, HIGH);
    delay(1000);
    digitalWrite(PIN_LED_RED, LOW);
    server.send(200, "application/json", "{\"status\":\"LED tested\"}");
  });
  
  // Message endpoint - Display custom message
  server.on("/message", HTTP_POST, []() {
    if (server.hasArg("plain")) {
      String message = server.arg("plain");
      Serial.println("[Message] " + message);
      server.send(200, "application/json", "{\"status\":\"received\"}");
    } else {
      server.send(400, "application/json", "{\"error\":\"no message\"}");
    }
  });
}

// ═══════════════════════════════════════════════════════════════
// HANDLE ALERT REQUEST
// ═══════════════════════════════════════════════════════════════

void handleAlertRequest() {
  Serial.println("\n╔════════════════════════════════════════╗");
  Serial.println("║   🚨 ALERT RECEIVED FROM BACKEND     ║");
  Serial.println("╚════════════════════════════════════════╝");
  
  if (server.hasArg("plain")) {
    String body = server.arg("plain");
    Serial.println("[Alert] Payload: " + body);
    
    // Parse JSON manually (simple parsing for this demo)
    // In production, use ArduinoJson library
    
    // Extract category
    int catPos = body.indexOf("\"category\":\"");
    if (catPos != -1) {
      int catStart = catPos + 12;
      int catEnd = body.indexOf("\"", catStart);
      lastAlertCategory = body.substring(catStart, catEnd);
    }
    
    // Extract child name
    int childPos = body.indexOf("\"childName\":\"");
    if (childPos != -1) {
      int childStart = childPos + 13;
      int childEnd = body.indexOf("\"", childStart);
      lastAlertChild = body.substring(childStart, childEnd);
    }
    
    totalAlertsReceived++;
    
    Serial.println("[Alert] Category: " + lastAlertCategory);
    Serial.println("[Alert] Child: " + lastAlertChild);
    Serial.println("[Alert] Total Alerts: " + String(totalAlertsReceived));
    
    // Trigger the alert!
    triggerAlert();
    
    server.send(200, "application/json", "{\"status\":\"alert triggered\",\"alertId\":" + String(totalAlertsReceived) + "}");
    
  } else {
    Serial.println("[Alert] ✗ No payload received");
    server.send(400, "application/json", "{\"error\":\"no payload\"}");
  }
}

// ═══════════════════════════════════════════════════════════════
// TRIGGER ALERT SEQUENCE
// ═══════════════════════════════════════════════════════════════

void triggerAlert() {
  Serial.println("\n[Action] 🔴 TRIGGERING ALERT DEVICES");
  
  alertActive = true;
  alertStartTime = millis();
  
  // Turn on Red LED
  digitalWrite(PIN_LED_RED, HIGH);
  Serial.println("[Action] Red LED ON");
  
  // Trigger Buzzer with pattern
  Serial.println("[Action] Buzzer sequence starting...");
  for (int i = 0; i < 3; i++) {
    tone(PIN_BUZZER, 2000, 300); // 2kHz tone for 300ms
    delay(400);
    tone(PIN_BUZZER, 1500, 300); // 1.5kHz tone for 300ms
    delay(400);
  }
  
  Serial.println("[Action] ✓ Alert devices activated");
  Serial.println("       Buzzer will stop after " + String(BUZZER_DURATION/1000) + " seconds");
  Serial.println("       LED will stop after " + String(LED_DURATION/1000) + " seconds");
  Serial.println("════════════════════════════════════════════\n");
}

// ═══════════════════════════════════════════════════════════════
// TEST ALERT (Manual trigger)
// ═══════════════════════════════════════════════════════════════

void triggerTestAlert() {
  Serial.println("[Test] Manual test alert triggered");
  lastAlertCategory = "TEST";
  lastAlertChild = "Manual Test";
  totalAlertsReceived++;
  triggerAlert();
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

void triggerBuzzer(int duration) {
  tone(PIN_BUZZER, 2000, duration);
  Serial.println("[Buzzer] Activated for " + String(duration) + "ms");
}

void blinkStatusLED(int times) {
  for (int i = 0; i < times; i++) {
    digitalWrite(PIN_LED_GREEN, HIGH);
    delay(200);
    digitalWrite(PIN_LED_GREEN, LOW);
    delay(200);
  }
}

// ═══════════════════════════════════════════════════════════════
// END OF CODE
// ═══════════════════════════════════════════════════════════════
