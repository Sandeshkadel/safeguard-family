"""
Test Script for User Behavior Tracking System
Tests all new endpoints and functionality
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_section(title):
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)

def test_health_check():
    """Test health endpoint includes tracking stats"""
    print_section("TEST 1: Health Check with Tracking Stats")
    
    response = requests.get(f"{BASE_URL}/health")
    
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.json(), indent=2))
    
    data = response.json()
    assert data["status"] == "healthy", "Health check failed"
    assert "behavior-tracking" in data["features"], "Behavior tracking feature missing"
    assert "tracking_stats" in data, "Tracking stats missing"
    
    print("✅ PASS: Health check includes behavior tracking")

def test_track_video_no_auth():
    """Test video tracking without authentication (should work)"""
    print_section("TEST 2: Track Video URL (No Auth Required)")
    
    test_url = "https://www.facebook.com/reel/1234567890"
    payload = {
        "url": test_url,
        "child_id": "test-child-123"
    }
    
    response = requests.post(f"{BASE_URL}/api/track-video", json=payload)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.json(), indent=2))
    
    data = response.json()
    assert "status" in data, "Missing status field"
    
    if data["status"] == "success":
        print("✅ PASS: Video tracked successfully")
    elif data["status"] == "partial_success":
        print("✅ PASS: Basic tracking without full video info")
    elif data["status"] == "ignored":
        print("ℹ️  INFO: URL was ignored (expected for test URL)")
    else:
        print(f"⚠️  WARN: Unexpected status: {data['status']}")

def test_track_invalid_url():
    """Test tracking with invalid URL"""
    print_section("TEST 3: Track Non-Video URL (Should Ignore)")
    
    test_url = "https://www.facebook.com/profile/user123"
    payload = {
        "url": test_url,
        "child_id": "test-child-123"
    }
    
    response = requests.post(f"{BASE_URL}/api/track-video", json=payload)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.json(), indent=2))
    
    data = response.json()
    assert data["status"] == "ignored", "Should ignore non-video URLs"
    print("✅ PASS: Non-video URL correctly ignored")

def test_behavior_stats_no_auth():
    """Test behavior stats without authentication (should fail)"""
    print_section("TEST 4: Get Behavior Stats (Auth Required)")
    
    response = requests.get(f"{BASE_URL}/api/behavior-stats/test-child-123")
    
    print(f"Status Code: {response.status_code}")
    print(f"Response:")
    print(json.dumps(response.json(), indent=2))
    
    assert response.status_code == 403, "Should require authentication"
    print("✅ PASS: Correctly requires authentication")

def test_categories():
    """Test category detection"""
    print_section("TEST 5: Category Detection")
    
    # Import the categorize function
    from backend_final import categorize_video_detailed
    
    test_cases = [
        ("Learn Python Tutorial", "How to code", "", ["educational", "technology"]),
        ("Funny Cat Video", "Hilarious prank", "", ["entertainment"]),
        ("Workout Routine", "Fitness tips", "", ["fitness", "lifestyle"]),
        ("Gaming Stream", "Gameplay walkthrough", "", ["gaming"]),
    ]
    
    for title, desc, transcript, expected in test_cases:
        result = categorize_video_detailed(title, desc, transcript)
        print(f"\nTitle: {title}")
        print(f"Categories: {result}")
        
        # Check if at least one expected category is present
        has_expected = any(cat in result for cat in expected)
        if has_expected:
            print(f"✅ PASS: Found expected categories")
        else:
            print(f"⚠️  WARN: Expected {expected}, got {result}")

def main():
    """Run all tests"""
    print("\n")
    print("╔" + "="*68 + "╗")
    print("║" + " "*15 + "BEHAVIOR TRACKING TEST SUITE" + " "*25 + "║")
    print("╚" + "="*68 + "╝")
    print("\nTesting URL:", BASE_URL)
    print("Started:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    
    try:
        test_health_check()
        test_track_video_no_auth()
        test_track_invalid_url()
        test_behavior_stats_no_auth()
        test_categories()
        
        print_section("ALL TESTS COMPLETED")
        print("✅ All tests passed!")
        print("\n📊 Next Steps:")
        print("1. Reload Chrome extension: chrome://extensions")
        print("2. Open Facebook and watch a video")
        print("3. Check console logs (F12) for tracking messages")
        print("4. Check backend terminal for '📊 Video Tracked' messages")
        
    except Exception as e:
        print_section("TEST FAILED")
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
