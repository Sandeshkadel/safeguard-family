# ESP32 Alert System - Hardware Setup Guide

## 🔧 Hardware Requirements

### Components Needed:
1. **ESP32 Development Board** (Any variant: ESP32 DevKit, NodeMCU-32S, etc.)
2. **Active Buzzer** (5V or 3.3V) OR **Passive Buzzer** with transistor
3. **LEDs:**
   - 1x Red LED (5mm)
   - 1x Green LED (5mm)
4. **Resistors:**
   - 2x 220Ω resistors (for LEDs)
   - 1x 1kΩ resistor (for button)
5. **Push Button** (tactile switch)
6. **Breadboard** and **Jumper Wires**
7. **USB Cable** (for power and programming)

---

## 📐 Wiring Diagram

```
ESP32 DevKit Pin Layout:
========================

                    ┌──────────────┐
                    │  USB Port    │
                    └──────────────┘
                    
    3V3  ──────────────────────────────  GND
    EN                                    GPIO23
    GPIO36                                GPIO22
    GPIO39                                GPIO1 (TX)
    GPIO34 ──────[Button]──────GND        GPIO3 (RX)
    GPIO35                                GPIO21
    GPIO32                                GPIO19
    GPIO33                                GPIO18
    GPIO25 ──────[Buzzer]──────GND        GPIO5
    GPIO26 ──────[Red LED]─────GND        GPIO17
    GPIO27 ──────[Green LED]───GND        GPIO16
    GPIO14                                GPIO4
    GPIO12                                GPIO0
    GND                                   GPIO2
    GPIO13                                GPIO15
    GPIO9                                 GPIO8
    GPIO10                                GPIO7
    GPIO11                                GPIO6
    3V3  ──────────────────────────────  GND

```

---

## 🔌 Detailed Connections

### 1. Buzzer Connection
```
ESP32 GPIO25 ────┬───[Buzzer +]───[Buzzer -]─── GND
                 │
           (Optional: Add 100Ω 
            resistor for volume)
```

**Buzzer Types:**
- **Active Buzzer:** Connect directly (has built-in oscillator)
- **Passive Buzzer:** Can produce different tones (better for this project)

**Connection:**
- Buzzer Positive (+) → GPIO 25
- Buzzer Negative (-) → GND

---

### 2. Red LED (Alert LED)
```
ESP32 GPIO26 ────[220Ω Resistor]────[LED Anode(+)]────[LED Cathode(-)]──── GND
```

**Connection:**
- GPIO 26 → 220Ω Resistor → LED Long Leg (Anode/+)
- LED Short Leg (Cathode/-) → GND

---

### 3. Green LED (Status LED)
```
ESP32 GPIO27 ────[220Ω Resistor]────[LED Anode(+)]────[LED Cathode(-)]──── GND
```

**Connection:**
- GPIO 27 → 220Ω Resistor → LED Long Leg (Anode/+)
- LED Short Leg (Cathode/-) → GND

---

### 4. Push Button (Manual Test)
```
ESP32 GPIO34 ────┬────[Button]────GND
                  │
              [10kΩ Pullup]
                  │
                3.3V
```

**Connection:**
- GPIO 34 → One side of button
- Other side of button → GND
- Internal pullup used (code enables it)

---

## 🖼️ Breadboard Layout (Top View)

```
         ┌────────────────────────────────────┐
         │         Breadboard                │
         │                                    │
    ┌────┴────┐                               │
    │  ESP32  │  [Green LED]────[Resistor]    │
    │ DevKit  │  [Red LED]──────[Resistor]    │
    │         │  [Buzzer +/−]                 │
    │         │  [Button]                     │
    └─────────┘                               │
         │                                    │
         └────────────────────────────────────┘
            GND Rail    3.3V Rail
```

---

## ⚙️ Step-by-Step Assembly

### Step 1: Prepare Components
1. Gather all components listed above
2. Test LEDs with a battery (to check polarity)
3. Test buzzer by connecting to 3.3V briefly

### Step 2: Setup Breadboard Power Rails
1. Connect ESP32 GND to breadboard GND rail (-)
2. Connect ESP32 3.3V to breadboard + rail
3. Add multiple GND connections if needed

### Step 3: Wire LEDs
1. Insert Red LED into breadboard
2. Connect 220Ω resistor to LED anode
3. Connect resistor to GPIO 26
4. Connect LED cathode to GND rail
5. Repeat for Green LED (GPIO 27)

### Step 4: Wire Buzzer
1. Insert buzzer into breadboard
2. Connect buzzer + to GPIO 25
3. Connect buzzer - to GND rail
4. (Optional: Add resistor for lower volume)

### Step 5: Wire Button
1. Insert button into breadboard
2. Connect one pin to GPIO 34
3. Connect other pin to GND
4. Code enables internal pullup (no external resistor needed)

### Step 6: Power Connection
1. Connect ESP32 to computer via USB cable
2. ESP32 will power on (green LED should blink during boot)

---

## 💻 Software Setup

### 1. Install Arduino IDE
Download from: https://www.arduino.cc/en/software

### 2. Install ESP32 Board Support
1. Open Arduino IDE
2. Go to **File → Preferences**
3. Add to "Additional Board Manager URLs":
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
4. Go to **Tools → Board → Board Manager**
5. Search "ESP32"
6. Install "ESP32 by Espressif Systems"

### 3. Select Board
1. Go to **Tools → Board → ESP32 Arduino**
2. Select your board (e.g., "ESP32 Dev Module")

### 4. Configure Upload Settings
- **Board:** ESP32 Dev Module
- **Upload Speed:** 921600
- **CPU Frequency:** 240MHz
- **Flash Frequency:** 80MHz
- **Flash Mode:** QIO
- **Flash Size:** 4MB
- **Port:** Select your COM port (e.g., COM3)

### 5. Configure WiFi
Edit in `esp32_alert_system.ino`:
```cpp
const char* WIFI_SSID = "YourWiFiName";        // Change this
const char* WIFI_PASSWORD = "YourWiFiPassword"; // Change this
```

### 6. Upload Code
1. Open `esp32_alert_system.ino`
2. Click **Verify** (checkmark icon)
3. Click **Upload** (arrow icon)
4. Wait for upload to complete

### 7. Monitor Serial Output
1. Open **Tools → Serial Monitor**
2. Set baud rate to **115200**
3. You should see startup messages
4. **Note the IP address displayed!**

### 8. Update Backend Configuration
1. Open `backend/.env` file
2. Update:
   ```
   ESP32_ALERT_URL=http://192.168.1.XXX/alert
   ```
   (Replace XXX with IP from serial monitor)

---

## 🧪 Testing

### Test 1: Power On Test
- Green LED should blink 3 times on startup
- Serial monitor shows "READY TO RECEIVE ALERTS"

### Test 2: Manual Button Test
- Press the button
- Buzzer should beep
- Red LED should light up
- Serial monitor shows "Manual test triggered"

### Test 3: Web Interface Test
1. Open browser
2. Go to: `http://[ESP32-IP-ADDRESS]`
3. You should see status page

### Test 4: Backend Integration Test
1. Start backend server
2. Trigger a blocked site from extension
3. ESP32 should receive alert and activate

---

## ❗ Troubleshooting

### Problem: ESP32 won't upload
**Solution:**
- Hold "BOOT" button while clicking upload
- Try different USB cable
- Check driver installation (CP210x or CH340)

### Problem: WiFi won't connect
**Solution:**
- Double-check SSID and password (case-sensitive)
- Ensure 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Move closer to router

### Problem: Buzzer too loud
**Solution:**
- Add 100-500Ω resistor in series
- Use PWM to lower volume in code:
  ```cpp
  ledcWriteTone(channel, frequency);
  ledcWrite(channel, 128); // 50% duty cycle
  ```

### Problem: LED not lighting
**Solution:**
- Check polarity (long leg = +)
- Check resistor value (should be 220Ω)
- Test LED with battery

### Problem: Backend can't reach ESP32
**Solution:**
- Ensure both on same WiFi network
- Check firewall settings
- Verify IP address is correct
- Try `http://[ESP32-IP]/ping` in browser

---

## 📊 Port Reference

| GPIO Pin | Function | Component |
|----------|----------|-----------|
| GPIO 25 | Output | Buzzer |
| GPIO 26 | Output | Red LED (Alert) |
| GPIO 27 | Output | Green LED (Status) |
| GPIO 34 | Input (Pullup) | Button |

---

## 🔐 Security Notes

- ESP32 runs simple HTTP server (no HTTPS in this version)
- Only accessible on local network
- No internet exposure required
- Consider adding authentication in production

---

## 🚀 Optional Enhancements

### Add OLED Display
- Show last alert on SSD1306 OLED
- Connect to I2C (GPIO 21/22)

### Add More LEDs
- Different colors for different categories
- Adult = Red, Gambling = Yellow, etc.

### Add IR Remote
- Silence buzzer remotely
- Reset alerts

### Add Battery
- LiPo battery + charging module
- More portable placement

---

## 📝 Component Shopping List (with links)

**ESP32 Board:**
- Search: "ESP32 DevKit V1"
- Price: $5-10

**Buzzer:**
- Search: "5V Active Buzzer Arduino"
- Price: $1-2

**LEDs:**
- Search: "5mm LED Red/Green Pack"
- Price: $1-5 (pack)

**Resistors:**
- Search: "Resistor Kit Arduino"
- Price: $5-10 (kit)

**Breadboard:**
- Search: "Half-size Breadboard"
- Price: $2-5

**Jumper Wires:**
- Search: "Breadboard Jumper Wire Kit"
- Price: $3-8

**Total Cost: ~$20-40**

---

## ✅ Final Checklist

- [ ] All components purchased
- [ ] Wiring completed correctly
- [ ] Arduino IDE installed
- [ ] ESP32 board support installed
- [ ] WiFi credentials updated in code
- [ ] Code uploaded successfully
- [ ] IP address noted
- [ ] Backend .env updated
- [ ] All tests passed
- [ ] Device placed at parent location

---

## 📞 Support

For issues:
1. Check serial monitor for errors
2. Verify all connections
3. Test components individually
4. Check GitHub issues/discussions

**Happy Building! 🛡️**
