═══════════════════════════════════════════════════════════════════════════════
   QUICK TESTING GUIDE - Copy/Paste Commands to Verify Everything Works
═══════════════════════════════════════════════════════════════════════════════

This file contains exact commands to test every feature of SafeGuard Family.

═══════════════════════════════════════════════════════════════════════════════
TEST 1: CHECK BACKEND IS RUNNING
═══════════════════════════════════════════════════════════════════════════════

Open PowerShell and run:

curl http://localhost:8000/health

Expected Output:
{
  "status":"healthy",
  "service":"SafeGuard Family - Parental Control System",
  "version":"2.1.0",
  "features":["parent-auth","video-analysis","comment-filtering","weekly-reports","multi-device"]
}

Status: ✅ If you see this, backend is working!


═══════════════════════════════════════════════════════════════════════════════
TEST 2: LIST ALL API ENDPOINTS
═══════════════════════════════════════════════════════════════════════════════

curl http://localhost:8000/api

Expected Output: List of all available endpoints with descriptions


═══════════════════════════════════════════════════════════════════════════════
TEST 3: PARENT REGISTRATION - CREATE TEST ACCOUNT
═══════════════════════════════════════════════════════════════════════════════

Run this command to register a new parent:

curl -X POST http://localhost:8000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"testparent@example.com\",\"password\":\"TestPassword123!\",\"full_name\":\"Test Parent User\"}"

Expected Output:
{
  "status":"success",
  "token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "parent":{
    "id":"...",
    "email":"testparent@example.com",
    "full_name":"Test Parent User"
  },
  "expires_in":86400
}

⚠️ IMPORTANT: Copy the TOKEN value - you'll need it for next tests!
   The token looks like: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...


═══════════════════════════════════════════════════════════════════════════════
TEST 4: PARENT LOGIN - AUTHENTICATE EXISTING ACCOUNT
═══════════════════════════════════════════════════════════════════════════════

Run this with the same email/password from Test 3:

curl -X POST http://localhost:8000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"testparent@example.com\",\"password\":\"TestPassword123!\"}"

Expected Output: Same as Test 3 (token + parent info)

Note: This proves login works! You get a NEW token each time you login.


═══════════════════════════════════════════════════════════════════════════════
TEST 5: ADD CHILD DEVICE
═══════════════════════════════════════════════════════════════════════════════

⚠️ Replace YOUR_TOKEN with the token from Test 3 or 4

curl -X POST http://localhost:8000/api/children ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Johnny\",\"device_id\":\"laptop_001\",\"device_name\":\"Johnny's Laptop\"}"

Example with real token:
curl -X POST http://localhost:8000/api/children ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Johnny\",\"device_id\":\"laptop_001\",\"device_name\":\"Johnny's Laptop\"}"

Expected Output:
{
  "status":"success",
  "child":{
    "id":"child-uuid-12345",
    "name":"Johnny",
    "device_id":"laptop_001",
    "device_name":"Johnny's Laptop",
    "created_at":"2026-02-08T15:30:00"
  }
}

⚠️ IMPORTANT: Copy the child ID (child-uuid-12345) - you'll need it for report test!


═══════════════════════════════════════════════════════════════════════════════
TEST 6: LIST ALL CHILDREN FOR PARENT
═══════════════════════════════════════════════════════════════════════════════

⚠️ Replace YOUR_TOKEN with your token

curl http://localhost:8000/api/children ^
  -H "Authorization: Bearer YOUR_TOKEN"

Expected Output:
{
  "status":"success",
  "children":[
    {
      "id":"child-uuid-12345",
      "name":"Johnny",
      "device_id":"laptop_001",
      "device_name":"Johnny's Laptop",
      "is_active":true,
      "videos_this_week":0,
      "last_activity":"2026-02-08T15:30:00",
      "created_at":"2026-02-08T15:30:00"
    }
  ],
  "total":1
}


═══════════════════════════════════════════════════════════════════════════════
TEST 7: GET WEEKLY REPORT FOR CHILD
═══════════════════════════════════════════════════════════════════════════════

⚠️ Replace YOUR_TOKEN with your token
⚠️ Replace CHILD_ID with the ID from Test 5

curl http://localhost:8000/api/reports/weekly/CHILD_ID ^
  -H "Authorization: Bearer YOUR_TOKEN"

Example:
curl http://localhost:8000/api/reports/weekly/child-uuid-12345 ^
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

Expected Output:
{
  "status":"success",
  "report":{
    "child_name":"Johnny",
    "week_start":"2026-02-01",
    "week_end":"2026-02-08",
    "total_videos":0,
    "total_duration_minutes":0,
    "average_duration_minutes":0,
    "flagged_videos":0,
    "comments_blocked":0,
    "videos":[],
    "safety_summary":"No videos watched this week. The system is ready to monitor when your child starts watching."
  }
}

Note: Reports are empty at first. They populate as child watches videos.


═══════════════════════════════════════════════════════════════════════════════
TEST 8: GET PARENT PROFILE
═══════════════════════════════════════════════════════════════════════════════

curl http://localhost:8000/api/profile ^
  -H "Authorization: Bearer YOUR_TOKEN"

Expected Output:
{
  "status":"success",
  "parent":{
    "id":"...",
    "email":"testparent@example.com",
    "full_name":"Test Parent User",
    "created_at":"2026-02-08T15:20:00",
    "last_login":"2026-02-08T15:30:00"
  }
}


═══════════════════════════════════════════════════════════════════════════════
TEST 9: LOGOUT
═══════════════════════════════════════════════════════════════════════════════

curl -X POST http://localhost:8000/api/auth/logout ^
  -H "Authorization: Bearer YOUR_TOKEN"

Expected Output:
{
  "status":"success",
  "message":"Logged out successfully"
}

After logout, that token is invalid. You'll need to login again for a new token.


═══════════════════════════════════════════════════════════════════════════════
TEST 10: TEST ERROR HANDLING - INVALID TOKEN
═══════════════════════════════════════════════════════════════════════════════

curl http://localhost:8000/api/children ^
  -H "Authorization: Bearer invalid_token"

Expected Output:
{
  "detail":"Invalid or expired token"
}

Status code: 401


═══════════════════════════════════════════════════════════════════════════════
TEST 11: TEST ERROR HANDLING - INVALID PASSWORD
═══════════════════════════════════════════════════════════════════════════════

curl -X POST http://localhost:8000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"testparent@example.com\",\"password\":\"WrongPassword\"}"

Expected Output:
{
  "detail":"Invalid email or password"
}

Status code: 401


═══════════════════════════════════════════════════════════════════════════════
TEST 12: TEST ERROR HANDLING - DUPLICATE EMAIL
═══════════════════════════════════════════════════════════════════════════════

Run registration again with same email from Test 3:

curl -X POST http://localhost:8000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"testparent@example.com\",\"password\":\"Password123!\",\"full_name\":\"Another User\"}"

Expected Output:
{
  "detail":"Email already registered"
}

Status code: 400


═══════════════════════════════════════════════════════════════════════════════
TESTING SUMMARY
═══════════════════════════════════════════════════════════════════════════════

After running all tests, you should see:

✅ TEST 1: Backend health check - PASS (200 OK)
✅ TEST 2: API list - PASS (shows endpoints)
✅ TEST 3: Registration - PASS (token created)
✅ TEST 4: Login - PASS (token created)
✅ TEST 5: Add child - PASS (child created)
✅ TEST 6: List children - PASS (shows child)
✅ TEST 7: Weekly report - PASS (empty report)
✅ TEST 8: Get profile - PASS (shows parent info)
✅ TEST 9: Logout - PASS (successful)
✅ TEST 10: Invalid token - PASS (401 error)
✅ TEST 11: Wrong password - PASS (401 error)
✅ TEST 12: Duplicate email - PASS (400 error)

If all tests pass: System is working correctly! ✨


═══════════════════════════════════════════════════════════════════════════════
TESTING IN EXTENSION (After loading in Chrome)
═══════════════════════════════════════════════════════════════════════════════

1. Open Chrome
2. Go to chrome://extensions
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select: c:\Users\acer\OneDrive\Desktop\ComFilter\chrome-extension
6. Click the extension icon in toolbar

Test Steps:
   1. You should see auth.html with 3 tabs
   2. Click "Parent Sign Up" tab
   3. Enter email, password, name
   4. Click "Register"
   5. Should redirect to dashboard
   6. You should see "Add New Child Device" button
   7. Click it, enter child name and device name
   8. Child should appear in left sidebar
   9. Select child, should load (empty) weekly report


═══════════════════════════════════════════════════════════════════════════════
PYTHON TESTING ALTERNATIVE (If curl not available)
═══════════════════════════════════════════════════════════════════════════════

Run this Python script to test:

import requests

# Test 1: Health Check
print("Test 1: Health Check")
r = requests.get('http://localhost:8000/health')
print(f"Status: {r.status_code}")
print(f"Response: {r.json()}\n")

# Test 2: Register Parent
print("Test 2: Register Parent")
register_data = {
    "email": "testparent@example.com",
    "password": "TestPassword123!",
    "full_name": "Test Parent User"
}
r = requests.post('http://localhost:8000/api/auth/register', json=register_data)
print(f"Status: {r.status_code}")
response = r.json()
print(f"Response: {response}")

# Save token for next tests
token = response.get('token')
print(f"Token: {token}\n")

# Test 3: List Children
if token:
    print("Test 3: List Children")
    headers = {'Authorization': f'Bearer {token}'}
    r = requests.get('http://localhost:8000/api/children', headers=headers)
    print(f"Status: {r.status_code}")
    print(f"Response: {r.json()}\n")

# Test 4: Add Child
if token:
    print("Test 4: Add Child")
    child_data = {
        "name": "Johnny",
        "device_id": "laptop_001",
        "device_name": "Johnny's Laptop"
    }
    r = requests.post('http://localhost:8000/api/children', 
                     headers=headers, json=child_data)
    print(f"Status: {r.status_code}")
    response = r.json()
    print(f"Response: {response}")
    
    # Get child ID
    child_id = response.get('child', {}).get('id')
    print(f"Child ID: {child_id}\n")
    
    # Test 5: Get Weekly Report
    if child_id:
        print("Test 5: Get Weekly Report")
        r = requests.get(f'http://localhost:8000/api/reports/weekly/{child_id}',
                        headers=headers)
        print(f"Status: {r.status_code}")
        print(f"Response: {r.json()}\n")


═══════════════════════════════════════════════════════════════════════════════

All tests completed! System should be fully functional.

═══════════════════════════════════════════════════════════════════════════════
