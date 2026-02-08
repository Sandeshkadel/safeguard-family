# ESP32 Alert System Documentation

## Overview

The ESP32 Alert System is a physical IoT device that provides real-time alerts to parents when the SafeGuard Family system blocks a harmful website.

## Features

- **WiFi Connected:** Connects to home network
- **HTTP Server:** Receives alerts from backend
- **Audible Alert:** Buzzer sounds when harmful site is blocked
- **Visual Alert:** Red LED lights up during alert
- **Status Indicator:** Green LED shows device is online
- **Manual Test:** Push button for testing buzzer/LED
- **Web Interface:** View status and stats via browser

## How It Works

```
Child Browser (School/Room)
    ↓
Chrome Extension detects harmful URL
    ↓
Backend Server classifies as blocked
    ↓
Backend sends HTTP POST to ESP32
    ↓
ESP32 triggers buzzer + red LED
    ↓
Parent is alerted immediately
```

## Important Notes

### This is NOT a tracking device
- Device is located at **parent's home**, not with the child
- Does not monitor child's location
- Does not store browsing data
- Only receives alert notifications from backend

### Privacy Considerations
- Device only receives:
  - Category of blocked site (e.g., "Adult")
  - Child's name/profile
  - Timestamp
- Does NOT receive:
  - Full URL details
  - Any personal data
  - Browsing history

## Setup Requirements

1. **Hardware:**
   - ESP32 board
   - Buzzer (active or passive)
   - Red LED + 220Ω resistor
   - Green LED + 220Ω resistor
   - Push button
   - Breadboard and wires

2. **Software:**
   - Arduino IDE with ESP32 support
   - WiFi network (2.4GHz)

3. **Network:**
   - Same network as backend server
   - Port 80 accessible
   - No special firewall rules needed

## Installation Steps

### 1. Hardware Assembly
Follow the wiring diagram in `wiring-diagram.md`:
- Connect buzzer to GPIO 25
- Connect red LED to GPIO 26 (with resistor)
- Connect green LED to GPIO 27 (with resistor)
- Connect button to GPIO 34

### 2. Software Configuration
1. Open `esp32_alert_system.ino` in Arduino IDE
2. Update WiFi credentials:
   ```cpp
   const char* WIFI_SSID = "YourWiFiName";
   const char* WIFI_PASSWORD = "YourWiFiPassword";
   ```
3. Select board: **Tools → Board → ESP32 Dev Module**
4. Select port: **Tools → Port → [Your COM Port]**
5. Upload code

### 3. Get Device IP Address
1. Open Serial Monitor (115200 baud)
2. Watch for connection message
3. Note the IP address displayed
4. Example: `WiFi Connected! IP: 192.168.1.105`

### 4. Update Backend Configuration
1. Open `backend/.env` file
2. Set the ESP32 URL:
   ```
   ESP32_ENABLED=true
   ESP32_ALERT_URL=http://192.168.1.105/alert
   ```
   (Use your actual IP address)
3. Restart backend server

### 5. Test Connection
**Method 1: Web Browser**
- Visit: `http://[ESP32-IP-ADDRESS]`
- You should see status page

**Method 2: Manual Button**
- Press button on breadboard
- Buzzer should beep, LED should light

**Method 3: Backend Test**
- Trigger a blocked site from extension
- ESP32 should receive alert

## API Endpoints

The ESP32 exposes these HTTP endpoints:

### GET `/`
Status page with device info
```
http://192.168.1.105/
```

### POST `/alert`
Receive alert from backend
```json
{
  "type": "blocked_site",
  "category": "Adult",
  "childName": "Child Name",
  "timestamp": "2024-01-01T12:00:00Z",
  "severity": "HIGH"
}
```

### GET `/ping`
Connection test
```json
{
  "status": "online",
  "device": "esp32"
}
```

### GET `/test/buzzer`
Test buzzer manually

### GET `/test/led`
Test LED manually

### POST `/message`
Display custom message
```json
{
  "message": "Test message"
}
```

## Alert Behavior

When an alert is received:

1. **Immediate:**
   - Red LED turns ON
   - Buzzer plays pattern (3 beeps)
   - Serial monitor logs event

2. **Duration:**
   - Buzzer: 3 seconds
   - LED: 10 seconds
   - Auto-stops after duration

3. **Status:**
   - Green LED stays on (device online)
   - Total alert count increments
   - Last alert details stored

## Troubleshooting

### Device Won't Connect to WiFi
**Symptoms:** Serial monitor shows "Connection failed"

**Solutions:**
- Check WiFi credentials (case-sensitive)
- Ensure 2.4GHz network (not 5GHz)
- Move closer to router
- Restart ESP32

### Backend Can't Reach ESP32
**Symptoms:** Backend logs show "ESP32 connection refused"

**Solutions:**
- Verify IP address is correct
- Check both devices on same network
- Try ping: `http://[ESP32-IP]/ping`
- Check firewall settings
- Restart ESP32

### Buzzer Not Working
**Symptoms:** LED works but no sound

**Solutions:**
- Check buzzer connections (polarity matters for some buzzers)
- Try different buzzer (active vs passive)
- Check GPIO 25 connection
- Test with `/test/buzzer` endpoint

### LED Not Lighting
**Symptoms:** Buzzer works but LED doesn't

**Solutions:**
- Check LED polarity (long leg = +)
- Verify 220Ω resistor is present
- Check GPIO 26/27 connections
- Test LED with battery

## Customization

### Change Alert Duration
Edit in code:
```cpp
const int BUZZER_DURATION = 3000;  // 3 seconds
const int LED_DURATION = 10000;    // 10 seconds
```

### Change Buzzer Tone
Edit in `triggerAlert()`:
```cpp
tone(PIN_BUZZER, 2000, 300); // frequency, duration
```

### Add More LEDs
```cpp
const int PIN_LED_YELLOW = 32;
pinMode(PIN_LED_YELLOW, OUTPUT);
```

### Change Server Port
```cpp
const int SERVER_PORT = 8080; // default is 80
```

## Power Options

### USB Power (Recommended for testing)
- Connect ESP32 to USB charger or computer
- Always powered on
- No battery needed

### Battery Power (Portable)
- Use LiPo battery (3.7V)
- Add TP4056 charging module
- Longer cable runs possible
- Requires charging

### External Power Supply
- Use 5V wall adapter
- Micro USB input
- Most reliable for 24/7 operation

## Placement Tips

1. **Location:**
   - Kitchen, living room, or parent's office
   - Near WiFi router for better signal
   - Where parent spends most time

2. **Mount:**
   - Place on desk or shelf
   - Optional: 3D print enclosure
   - Keep buzzer unobstructed

3. **Visibility:**
   - LEDs should be visible
   - Easy access to button
   - Serial port accessible for debugging

## Security Considerations

### Network Security
- Device only on local network
- No internet exposure needed
- No port forwarding required

### Data Privacy
- Minimal data transmitted
- No personal information stored
- Only category and child name sent

### Physical Security
- Keep device in parent's area
- Not accessible to children
- Button press only triggers test

## Advanced Features (Optional)

### Add OLED Display
Show alert details on screen:
```cpp
#include <Adafruit_SSD1306.h>
display.println("Alert: " + category);
```

### Add MQTT Support
For more reliable messaging:
```cpp
#include <PubSubClient.h>
mqtt.subscribe("safeguard/alerts");
```

### Add Authentication
Secure the endpoints:
```cpp
if (server.arg("token") != "your-secret-token") {
  server.send(401, "application/json", "{\"error\":\"unauthorized\"}");
}
```

### Add Multiple Buzzers
Different sounds for different categories:
```cpp
if (category == "Adult") {
  tone(PIN_BUZZER, 2500);
} else if (category == "Gambling") {
  tone(PIN_BUZZER, 2000);
}
```

## Maintenance

### Regular Tasks
- [ ] Check WiFi connection weekly
- [ ] Test button monthly
- [ ] Update firmware as needed
- [ ] Check power cable

### When Moving
1. Note current IP address
2. Connect to new network
3. Update WiFi credentials in code
4. Re-upload firmware
5. Update backend .env with new IP

## Performance

- **Response Time:** < 1 second from backend to alert
- **Power Consumption:** ~500mA during alert, ~100mA idle
- **WiFi Range:** Up to 100ft (30m) depending on router
- **Uptime:** Designed for 24/7 operation

## Technical Specifications

| Specification | Value |
|---------------|-------|
| Microcontroller | ESP32 (Dual-core, 240MHz) |
| WiFi | 802.11 b/g/n (2.4GHz) |
| GPIO Pins Used | 4 (25, 26, 27, 34) |
| Power Input | 5V via USB |
| Operating Temp | 0°C to 50°C |
| Buzzer Frequency | 1500-2500 Hz |
| LED Current | ~20mA per LED |

## Cost Breakdown

| Component | Approximate Cost |
|-----------|-----------------|
| ESP32 Board | $5-10 |
| Buzzer | $1-2 |
| LEDs (2x) | $0.50-1 |
| Resistors (3x) | $0.10-0.50 |
| Button | $0.20-0.50 |
| Breadboard | $2-5 |
| Wires | $2-5 |
| **Total** | **~$11-24** |

## FAQs

**Q: Can I use this with multiple children?**
A: Yes! The device receives alerts for all children under your account.

**Q: What if I'm not home?**
A: You'll still receive email notifications. ESP32 is supplementary.

**Q: Can the child hear the buzzer?**
A: No, device is at parent's location, not with the child.

**Q: How do I silence the alarm?**
A: It auto-stops after configured duration (default 3-10 seconds).

**Q: Can I build multiple devices?**
A: Yes, but each needs unique configuration.

**Q: Does it work with mobile hotspot?**
A: Yes, as long as backend can reach it.

---

For more help, see:
- [Wiring Diagram](wiring-diagram.md)
- [Main README](../README.md)
- [Backend Documentation](../backend/)

Built with ❤️ for family safety
