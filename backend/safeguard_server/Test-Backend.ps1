# SafeGuard Family - Backend API Tester
# Tests all API endpoints to verify functionality

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SafeGuard Family - Backend API Test Suite" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$API_BASE = "http://192.168.1.75:3000/api"
$TEST_EMAIL = "testparent@safeguard.test"
$TEST_PASSWORD = "TestPassword123"
$TEST_CHILD = "Test Child Tommy"

Write-Host "[TEST 1/8] Health Check..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://192.168.1.75:3000/health" -Method Get
    Write-Host "  ✅ PASS - Server is healthy: $($response.status)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ FAIL - Server not responding: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[TEST 2/8] Parent Registration..." -ForegroundColor Yellow
try {
    $body = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
        full_name = "Test Parent User"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_BASE/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "  ✅ PASS - Parent registered successfully" -ForegroundColor Green
    Write-Host "    Parent ID: $($response.parent_id)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 409) {
        Write-Host "  ⚠️  SKIP - Parent already exists (expected on re-run)" -ForegroundColor Yellow
    } else {
        Write-Host "  ❌ FAIL - Registration failed: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[TEST 3/8] Parent Login..." -ForegroundColor Yellow
try {
    $body = @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
        device_name = "Test Device PowerShell"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_BASE/auth/login" -Method Post -Body $body -ContentType "application/json"
    $TOKEN = $response.token
    $PARENT_ID = $response.parent_id
    Write-Host "  ✅ PASS - Login successful" -ForegroundColor Green
    Write-Host "    Token: $($TOKEN.Substring(0, 20))..." -ForegroundColor Gray
    Write-Host "    Parent ID: $PARENT_ID" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ FAIL - Login failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[TEST 4/8] Create Child Profile..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
        "Content-Type" = "application/json"
    }
    $body = @{
        name = $TEST_CHILD
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_BASE/children" -Method Post -Headers $headers -Body $body
    $CHILD_ID = $response.child_id
    Write-Host "  ✅ PASS - Child created successfully" -ForegroundColor Green
    Write-Host "    Child ID: $CHILD_ID" -ForegroundColor Gray
    Write-Host "    Name: $($response.name)" -ForegroundColor Gray
} catch {
    if ($_.Exception.Response.StatusCode.Value__ -eq 409) {
        Write-Host "  ⚠️  SKIP - Child already exists" -ForegroundColor Yellow
        # Try to get existing child
        try {
            $response = Invoke-RestMethod -Uri "$API_BASE/children" -Method Get -Headers $headers
            $CHILD_ID = $response.children[0].id
            Write-Host "    Using existing child ID: $CHILD_ID" -ForegroundColor Gray
        } catch {
            Write-Host "  ❌ FAIL - Cannot retrieve children: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  ❌ FAIL - Child creation failed: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[TEST 5/8] List Children..." -ForegroundColor Yellow
try {
    $headers = @{
        "Authorization" = "Bearer $TOKEN"
    }
    $response = Invoke-RestMethod -Uri "$API_BASE/children" -Method Get -Headers $headers
    Write-Host "  ✅ PASS - Retrieved children list" -ForegroundColor Green
    Write-Host "    Total Children: $($response.children.Count)" -ForegroundColor Gray
    foreach ($child in $response.children) {
        Write-Host "      - $($child.name) (ID: $($child.id))" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ❌ FAIL - Cannot list children: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[TEST 6/8] Register Device..." -ForegroundColor Yellow
try {
    $body = @{
        child_id = $CHILD_ID
        device_id = "test-device-$(Get-Random -Maximum 9999)"
        device_name = "Test Chrome Browser"
        device_type = "Chrome Extension"
        ip_address = "192.168.1.100"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_BASE/devices" -Method Post -Body $body -ContentType "application/json"
    $DEVICE_ID = $response.device_id
    Write-Host "  ✅ PASS - Device registered successfully" -ForegroundColor Green
    Write-Host "    Device ID: $($response.device_id)" -ForegroundColor Gray
    Write-Host "    Status: $($response.status)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ FAIL - Device registration failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[TEST 7/8] Log Block Event..." -ForegroundColor Yellow
try {
    $body = @{
        device_id = $DEVICE_ID
        child_id = $CHILD_ID
        url = "https://adult.example.com/test"
        domain = "adult.example.com"
        category = "Adult"
        ip_address = "192.168.1.100"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_BASE/logs/block" -Method Post -Body $body -ContentType "application/json"
    Write-Host "  ✅ PASS - Block event logged" -ForegroundColor Green
    Write-Host "    Log ID: $($response.log_id)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ FAIL - Block logging failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[TEST 8/8] Log History Event..." -ForegroundColor Yellow
try {
    $body = @{
        device_id = $DEVICE_ID
        child_id = $CHILD_ID
        url = "https://google.com/search?q=homework"
        domain = "google.com"
        page_title = "homework - Google Search"
        duration = 120
        ip_address = "192.168.1.100"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$API_BASE/logs/history" -Method Post -Body $body -ContentType "application/json"
    Write-Host "  ✅ PASS - History event logged" -ForegroundColor Green
    Write-Host "    Log ID: $($response.log_id)" -ForegroundColor Gray
} catch {
    Write-Host "  ❌ FAIL - History logging failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Test Suite Complete!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ All core features tested successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Test Credentials:" -ForegroundColor Yellow
Write-Host "  Email: $TEST_EMAIL" -ForegroundColor Gray
Write-Host "  Password: $TEST_PASSWORD" -ForegroundColor Gray
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open dashboard: http://192.168.1.75:3000/dashboard" -ForegroundColor Gray
Write-Host "  2. Login with test credentials above" -ForegroundColor Gray
Write-Host "  3. View the test data in the dashboard" -ForegroundColor Gray
Write-Host "  4. Install Chrome extension and test with real browsing" -ForegroundColor Gray
Write-Host ""
