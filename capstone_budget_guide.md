# Capstone DIY Budget-Friendly UHF Attendance Reader Blueprint

For a student capstone project, buying $300+ industrial UHF reader nodes is rarely feasible. You can build a highly functional, long-range **UHF RFID Reader Gate** yourself for around **$20–$35** using an **ESP32 microcontroller** and a **serial UHF RFID module**.

---

## 1. Shopping List (Estimated Budget)

| Component | Description | Est. Price (USD) | Est. Price (PHP) |
| :--- | :--- | :--- | :--- |
| **ESP32 NodeMCU Development Board** | Main processor with built-in Wi-Fi to send HTTP requests directly to the Laravel API. | $4.00 | ₱220.00 |
| **YRM100 (or JT-2850) UHF RFID Module** | Serial UART UHF reader module. Reads standard ISO18000-6C tags at a range of 1 to 2.5 meters. | $18.00 | ₱1,000.00 |
| **Passive UHF RFID Cards / Tags** | Standard ISO18000-6C PVC cards or adhesive back tags (e.g. Alien H3). | $0.40 each | ₱20.00 each |
| **Jumper Wires & Breadboard** | For solderless connections. | $2.50 | ₱140.00 |
| **5V 2A USB Power Adapter & Micro USB Cable** | Power source for ESP32 and UHF reader module. | $3.50 | ₱200.00 |
| **TOTAL** | **Estimated build cost for one gate reader** | **~$28.40** | **~₱1,580.00** |

---

## 2. Wiring Diagram

The UHF module communicates with the ESP32 using **Serial UART**. Connect them as follows:

```
    UHF RFID Module (YRM100)              ESP32 NodeMCU
    ┌──────────────────────┐             ┌─────────────────────┐
    │                 VCC  ├────────────>┤  Vin / 5V           │  (Requires 5V)
    │                 GND  ├────────────>┤  GND                │
    │                 TXD  ├────────────>┤  RX2 (GPIO 16)      │  (UART RX)
    │                 RXD  ├────────────>┤  TX2 (GPIO 17)      │  (UART TX)
    └──────────────────────┘             └─────────────────────┘
```

---

## 3. ESP32 Arduino C++ Code (Firmware)

Copy this code into your **Arduino IDE**. It connects the ESP32 to the school Wi-Fi, listens to the UHF RFID reader module, parses detected tag numbers, and sends them directly to your Laravel API.

> [!NOTE]
> Make sure to install the ESP32 board library in the Arduino IDE before compiling this script.

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

// 1. Wi-Fi Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// 2. Laravel API Configuration
// Replace with the IP address of your computer running the XAMPP server
const char* apiEndpoint = "http://192.168.1.xxx:8000/api/attendance/scan"; 
const char* authToken = "YOUR_TEACHER_OR_ADMIN_API_TOKEN"; // Optional, if using Sanctum auth

// 3. Serial Ports Configuration
// ESP32 Hardware Serial 2 (RX2=GPIO 16, TX2=GPIO 17)
#define RXD2 16
#define TXD2 17

HardwareSerial UHFReader(2);

void setup() {
  Serial.begin(115200);
  UHFReader.begin(115200, SERIAL_8N1, RXD2, TXD2); // Connects to YRM100 module
  
  Serial.println("Initializing DIY UHF Gate Reader...");

  // Connect to Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected successfully!");
  Serial.print("Local IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Check if UHF RFID Module sent data
  if (UHFReader.available() > 0) {
    // Read the response packet from the UHF reader module
    // YRM100 modules send a byte frame starting with 0xBB (header)
    byte buffer[64];
    int len = UHFReader.readBytes(buffer, sizeof(buffer));

    if (len >= 20 && buffer[0] == 0xBB) {
      // Parse the EPC code (the RFID tag ID)
      // Standard EPC tags are 12 bytes long, usually starting at index 7 or 8 in the packet
      String rfidTag = "";
      for (int i = 7; i < 19; i++) {
        if (buffer[i] < 0x10) rfidTag += "0";
        rfidTag += String(buffer[i], HEX);
      }
      rfidTag.toUpperCase();
      
      Serial.println("\n----------------------------------------");
      Serial.print("RFID Tag Scanned: ");
      Serial.println(rfidTag);

      // Forward tag to Laravel Web API
      if (WiFi.status() == WL_CONNECTED) {
        sendAttendanceScan(rfidTag);
      } else {
        Serial.println("Cannot sync. Wi-Fi disconnected.");
      }
      
      // Delay to avoid double scans of the same tag in quick succession
      delay(3000); 
    }
  }
}

// Function to send POST request to Laravel Backend API
void sendAttendanceScan(String rfid) {
  HTTPClient http;
  
  http.begin(apiEndpoint);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Accept", "application/json");
  
  // If you require authentication token:
  // http.addHeader("Authorization", "Bearer " + String(authToken));

  // Construct JSON Payload
  String jsonPayload = "{\"rfid\":\"" + rfid + "\",\"direction\":null}";
  
  Serial.print("Sending POST request to backend... ");
  int httpResponseCode = http.POST(jsonPayload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.print("HTTP Code: ");
    Serial.println(httpResponseCode);
    Serial.println("Response payload from server: " + response);
  } else {
    Serial.print("Error sending POST request. HTTP Code: ");
    Serial.println(httpResponseCode);
  }
  
  http.end();
}
```

---

## 4. Why This Works Perfectly for Capstone Presentations
1. **Interactive Demo**: You can wave your hands with the cards near the YRM100 reader (1–2 meters range), and the scan immediately updates on your screen at `http://localhost:5173/app/rfid_scan` and triggers parents' SMS logs.
2. **Professional Architecture**: Showing how a physical microcontroller (ESP32) talks over local Wi-Fi networks to a Laravel API server provides high-quality architecture scoring.
3. **Dynamic Feedback**: Visual radar grids on the UI mapping to physical card range reads make the system look complete and market-ready.
