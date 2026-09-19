"""
================================================================================
UHF RFID USB Bridge for 915MHz Reader (Model: QW0A - V1.32 / VID:04D8 PID:033F)
FCU Kindergarten RFID Attendance Monitoring System
================================================================================

This daemon runs locally on Windows, communicates directly with the USB HID
reader, extracts EPC tags, and automatically pushes attendance records to your
Laravel backend API at:
    http://localhost:8000/api/attendance/scan

Prerequisites (install once via PowerShell / Command Prompt):
    pip install hidapi requests

IMPORTANT:
    Close the 'RFID READER DEMO' Windows software before running this script,
    as Windows only allows one program to access the USB device at a time.
"""

import sys
import time
import re
from datetime import datetime

try:
    # pyrefly: ignore [missing-import]
    import hid
except ImportError:
    print("\n[!] 'hidapi' library is not installed.")
    print("    Please run: pip install hidapi requests\n")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("\n[!] 'requests' library is not installed.")
    print("    Please run: pip install requests\n")
    sys.exit(1)

# Device Configuration
VENDOR_ID = 0x04D8      # Microchip Technology / QW0A
PRODUCT_ID = 0x033F     # AD-QW0A_HID
LARAVEL_API_URL = "http://localhost:8000/api/attendance/scan"
DEFAULT_DIRECTION = "in" # 'in' or 'out' (toggleable or auto-resolved by backend)
COOLDOWN_SECONDS = 5    # Anti-spam cooldown per tag

# Start Inventory Command for QW0A: 7C FF FF 81 32 00 D3
CMD_START_INVENTORY = bytes([0x7C, 0xFF, 0xFF, 0x81, 0x32, 0x00, 0xD3])

# Memory cache for cooldown debouncing
last_seen_tags = {}

def send_attendance_to_laravel(epc, rssi=None):
    """Posts scanned tag to the Laravel Attendance API."""
    payload = {
        "rfid": epc,
        "direction": DEFAULT_DIRECTION,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "time": datetime.now().strftime("%I:%M:%S %p")
    }
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    try:
        response = requests.post(LARAVEL_API_URL, json=payload, headers=headers, timeout=5)
        if response.status_code in [200, 201]:
            data = response.json()
            student_name = data.get("student", {}).get("name", "Unknown Pupil")
            
            if data.get("ignored"):
                print(f"  [IGNORED SCAN] -> Tag {epc} ({student_name}) is currently active/checked in. Scan ignored until checked out.")
            else:
                attendance_obj = data.get("attendance") or {}
                status = attendance_obj.get("status", "Present")
                direction = data.get("direction", DEFAULT_DIRECTION).upper()
                print(f"  [SUCCESS] -> {student_name} | {direction} | Status: {status}")
                
                sms_logs = data.get("sms_logs", [])
                if sms_logs:
                    for s in sms_logs:
                        print(f"             SMS Sent -> {s.get('guardian_name')}: {s.get('phone')}")
        elif response.status_code == 404:
            print(f"  [UNREGISTERED] -> Tag {epc} is not assigned to any student in database.")
        else:
            print(f"  [API ERROR {response.status_code}] -> {response.text}")
    except requests.exceptions.RequestException as e:
        print(f"  [CONN ERROR] -> Could not reach Laravel API at {LARAVEL_API_URL}: {e}")

def parse_epc_from_packet(data_bytes):
    """
    Extracts 24-hex-character EPC from RCP AUTO packet:
    CC FF 20 05 10 00 30 00 [E2 80 6A 96 00 00 50 1A B7 46 39 24] D6 D5
    """
    hex_str = data_bytes.hex().upper()
    
    # 1. Look for RCP AUTO pattern
    match = re.search(r"CCFF[0-9A-F]{4}[0-9A-F]{4}3000([0-9A-F]{24})", hex_str)
    if match:
        return match.group(1)
        
    # 2. Look for Gen2 EPC pattern (starts with E2)
    match = re.search(r"E2[0-9A-F]{22}", hex_str)
    if match:
        return match.group(0)

    # 3. Any 24-character hexadecimal sequence
    match = re.search(r"[0-9A-F]{24}", hex_str)
    if match and match.group(0) not in ["000000000000000000000000", "FFFFFFFFFFFFFFFFFFFFFFFF"]:
        return match.group(0)

    return None

def main():
    print("=" * 70)
    print("  FCU UHF RFID Hardware Bridge (QW0A 915MHz USB HID)")
    print(f"  Target Device: VID=0x{VENDOR_ID:04X} PID=0x{PRODUCT_ID:04X}")
    print(f"  Laravel API:   {LARAVEL_API_URL}")
    print("=" * 70)
    print("[*] Searching for connected USB UHF RFID Reader...")

    device = None
    try:
        device = hid.device()
        device.open(VENDOR_ID, PRODUCT_ID)
        print(f"[+] Device Connected successfully!")
        print(f"    Manufacturer: {device.get_manufacturer_string()}")
        print(f"    Product:      {device.get_product_string()}")
        print(f"    Serial:       {device.get_serial_number_string()}")
        print("[*] Sending Inventory Start command...")
        try:
            # Send start command via report 0
            device.write(b'\x00' + CMD_START_INVENTORY)
        except Exception as e:
            # Fallback direct write
            try:
                device.write(CMD_START_INVENTORY)
            except Exception:
                pass

        print("\n[READY] Listening for RFID tags... Wave your cards near the reader antenna!")
        print("        (Press Ctrl+C to stop)\n")

        while True:
            # Read up to 64 bytes with 500ms timeout
            data = device.read(64, 500)
            if data:
                raw_bytes = bytes(data)
                epc = parse_epc_from_packet(raw_bytes)
                if epc:
                    now = time.time()
                    last_seen = last_seen_tags.get(epc, 0)
                    if now - last_seen < COOLDOWN_SECONDS:
                        continue # Cooldown active

                    last_seen_tags[epc] = now
                    timestamp = datetime.now().strftime("%H:%M:%S")
                    print(f"[{timestamp}] TAG DETECTED -> EPC: {epc}")
                    send_attendance_to_laravel(epc)

    except hid.HIDException as e:
        print(f"\n[!] USB Error: {e}")
        print("    Remedy: Make sure 'RFID READER DEMO' is DISCONNECTED or CLOSED first.")
    except KeyboardInterrupt:
        print("\n[*] Stopping UHF RFID Reader Bridge. Goodbye!")
    finally:
        if device:
            device.close()

if __name__ == "__main__":
    main()
