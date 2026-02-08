#!/usr/bin/env python3
"""
SafeGuard Family - System Test Script
Tests all endpoints to verify system is working
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = 'http://192.168.254.156:3000'
API_URL = f'{BASE_URL}/api'

# Colors for output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{text:^60}{Colors.ENDC}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*60}{Colors.ENDC}\n")

def print_success(text):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")

# ═══════════════════════════════════════════════════════════════
# TEST 1: CHECK SERVER IS RUNNING
# ═══════════════════════════════════════════════════════════════

def test_server_connection():
    print_header("TEST 1: Server Connection")
    
    try:
        response = requests.get(f'{BASE_URL}/health', timeout=5)
        if response.status_code == 200:
            print_success(f"Flask server is RUNNING at {BASE_URL}")
            data = response.json()
            print_info(f"Server version: {data.get('version')}")
            return True
        else:
            print_error(f"Server returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to {BASE_URL}")
        print_warning("Make sure Flask server is running: python backend/safeguard_server/app.py")
        return False
    except Exception as e:
        print_error(f"Connection error: {str(e)}")
        return False

# ═══════════════════════════════════════════════════════════════
# TEST 2: CHECK /API ENDPOINT
# ═══════════════════════════════════════════════════════════════

def test_api_endpoint():
    print_header("TEST 2: API Endpoint")
    
    try:
        response = requests.get(f'{API_URL}', timeout=5)
        if response.status_code == 200:
            print_success(f"/api endpoint is responding with JSON")
            data = response.json()
            print_info(f"Message: {data.get('message')}")
            print_info(f"Available endpoints:")
            for key, value in data.get('endpoints', {}).items():
                print(f"  - {key}: {value}")
            return True
        else:
            print_error(f"/api returned status {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"API test failed: {str(e)}")
        return False

# ═══════════════════════════════════════════════════════════════
# TEST 3: REGISTER PARENT ACCOUNT
# ═══════════════════════════════════════════════════════════════

def test_parent_registration():
    print_header("TEST 3: Parent Registration")
    
    test_email = f'test-{datetime.now().timestamp()}@example.com'
    test_password = 'TestPassword123!'
    
    try:
        payload = {
            'email': test_email,
            'password': test_password,
            'full_name': 'Test Parent'
        }
        response = requests.post(
            f'{API_URL}/auth/register',
            json=payload,
            timeout=5
        )
        
        if response.status_code in [200, 201]:
            print_success("Parent registration successful")
            data = response.json()
            print_info(f"Parent ID: {data.get('parent_id')}")
            print_info(f"Parent email: {data.get('email')}")
            return {
                'parent_id': data.get('parent_id'),
                'email': test_email,
                'password': test_password,
                'token': data.get('token')
            }
        else:
            print_error(f"Registration failed with status {response.status_code}")
            print_info(f"Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"Registration test failed: {str(e)}")
        return None

# ═══════════════════════════════════════════════════════════════
# TEST 4: LOGIN & GET TOKEN
# ═══════════════════════════════════════════════════════════════

def test_parent_login(email, password):
    print_header("TEST 4: Parent Login")
    
    try:
        payload = {
            'email': email,
            'password': password
        }
        response = requests.post(
            f'{API_URL}/auth/login',
            json=payload,
            timeout=5
        )
        
        if response.status_code == 200:
            print_success("Parent login successful")
            data = response.json()
            token = data.get('token')
            print_info(f"Auth token: {token[:20]}...")
            return token
        else:
            print_error(f"Login failed with status {response.status_code}")
            print_info(f"Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"Login test failed: {str(e)}")
        return None

# ═══════════════════════════════════════════════════════════════
# TEST 5: CREATE CHILD
# ═══════════════════════════════════════════════════════════════

def test_create_child(token):
    print_header("TEST 5: Create Child Profile")
    
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        payload = {
            'name': 'Test Child'
        }
        response = requests.post(
            f'{API_URL}/children',
            json=payload,
            headers=headers,
            timeout=5
        )
        
        if response.status_code in [200, 201]:
            print_success("Child created successfully")
            data = response.json()
            child_id = data.get('child_id') or data.get('id')
            print_info(f"Child ID: {child_id}")
            return child_id
        else:
            print_error(f"Child creation failed with status {response.status_code}")
            print_info(f"Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"Child creation test failed: {str(e)}")
        return None

# ═══════════════════════════════════════════════════════════════
# TEST 6: REGISTER DEVICE
# ═══════════════════════════════════════════════════════════════

def test_register_device(token, child_id):
    print_header("TEST 6: Register Device")
    
    try:
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        payload = {
            'child_id': child_id,
            'device_id': 'test-device-001',
            'device_name': 'Test Computer',
            'device_type': 'Windows'
        }
        response = requests.post(
            f'{API_URL}/devices',
            json=payload,
            headers=headers,
            timeout=5
        )
        
        if response.status_code in [200, 201]:
            print_success("Device registered successfully")
            data = response.json()
            print_info(f"Device: {data.get('device_name')}")
            return True
        else:
            print_error(f"Device registration failed with status {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Device registration test failed: {str(e)}")
        return False

# ═══════════════════════════════════════════════════════════════
# TEST 7: LOG HISTORY
# ═══════════════════════════════════════════════════════════════

def test_log_history(child_id):
    print_header("TEST 7: Log Browsing History")
    
    try:
        payload = {
            'child_id': child_id,
            'device_id': 'test-device-001',
            'url': 'https://www.google.com',
            'domain': 'google.com',
            'page_title': 'Google'
        }
        response = requests.post(
            f'{API_URL}/logs/history',
            json=payload,
            timeout=5
        )
        
        if response.status_code in [200, 201]:
            print_success("History logged successfully")
            data = response.json()
            print_info(f"Log ID: {data.get('log_id')}")
            return True
        else:
            print_error(f"History logging failed with status {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"History logging test failed: {str(e)}")
        return False

# ═══════════════════════════════════════════════════════════════
# TEST 8: LOG BLOCKED SITE
# ═══════════════════════════════════════════════════════════════

def test_log_block(child_id):
    print_header("TEST 8: Log Blocked Site")
    
    try:
        payload = {
            'child_id': child_id,
            'device_id': 'test-device-001',
            'url': 'https://blocked-example.com',
            'domain': 'blocked-example.com',
            'category': 'Adult'
        }
        response = requests.post(
            f'{API_URL}/logs/block',
            json=payload,
            timeout=5
        )
        
        if response.status_code in [200, 201]:
            print_success("Block logged successfully")
            data = response.json()
            print_info(f"Log ID: {data.get('log_id')}")
            return True
        else:
            print_error(f"Block logging failed with status {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Block logging test failed: {str(e)}")
        return False

# ═══════════════════════════════════════════════════════════════
# MAIN TEST RUNNER
# ═══════════════════════════════════════════════════════════════

def main():
    print(f"\n{Colors.BOLD}{Colors.OKBLUE}")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║  SAFEGUARD FAMILY - SYSTEM HEALTH CHECK                   ║")
    print("║  Testing all endpoints and data flow                      ║")
    print("╚════════════════════════════════════════════════════════════╝")
    print(f"{Colors.ENDC}\n")
    
    # Run tests
    tests_passed = 0
    tests_total = 0
    
    # Test 1
    tests_total += 1
    if test_server_connection():
        tests_passed += 1
    
    # Test 2
    tests_total += 1
    if test_api_endpoint():
        tests_passed += 1
    
    # Test 3
    tests_total += 1
    parent = test_parent_registration()
    if parent:
        tests_passed += 1
    
    # Test 4
    if parent:
        tests_total += 1
        token = test_parent_login(parent['email'], parent['password'])
        if token:
            tests_passed += 1
        else:
            token = parent.get('token')
    
    # Test 5
    if token:
        tests_total += 1
        child_id = test_create_child(token)
        if child_id:
            tests_passed += 1
    
    # Test 6
    if token and child_id:
        tests_total += 1
        if test_register_device(token, child_id):
            tests_passed += 1
    
    # Test 7
    if child_id:
        tests_total += 1
        if test_log_history(child_id):
            tests_passed += 1
    
    # Test 8
    if child_id:
        tests_total += 1
        if test_log_block(child_id):
            tests_passed += 1
    
    # Summary
    print_header(f"Summary: {tests_passed}/{tests_total} Tests Passed")
    
    if tests_passed == tests_total:
        print_success(f"All {tests_total} tests passed! System is working correctly.")
        sys.exit(0)
    else:
        print_error(f"{tests_total - tests_passed} test(s) failed. See errors above.")
        sys.exit(1)

if __name__ == '__main__':
    main()
