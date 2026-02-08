"""
Comprehensive Test Script for Comment Filtering & Cross-Device Sync
Tests Nepali words, emojis, hidden comments dashboard, and data sync
"""

import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:8000"

def print_section(title):
    print("\n" + "="*80)
    print(f"  {title}")
    print("="*80)

def test_comment_filter_nepali():
    """Test Nepali toxic words filtering"""
    print_section("TEST 1: Nepali Words Filtering")
    
    test_comments = [
        {
            "text": "Mug gas didaima des ko bikash hunxa ra",
            "expected": True,
            "word": "mug"
        },
        {
            "text": "Mugi k ho yesto kura greko",
            "expected": True,
            "word": "mugi"
        },
        {
            "text": "Kasto randi type ko kura",
            "expected": True,
            "word": "randi/kasto"
        },
        {
            "text": "Chutiya jasto kura grya ho",
            "expected": True,
            "word": "chutiya"
        },
        {
            "text": "This is a normal comment",
            "expected": False,
            "word": "none"
        }
    ]
    
    passed = 0
    failed = 0
    
    for i, test in enumerate(test_comments, 1):
        print(f"\n[{i}] Testing: \"{test['text']}\"")
        print(f"    Expected to hide: {test['expected']}")
        print(f"    Target word: {test['word']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/analyze-comment",
                json={"text": test['text']},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                should_hide = result.get("hide", False)
                
                print(f"    Backend says: hide={should_hide}")
                print(f"    Reason: {result.get('reason', 'N/A')}")
                
                if should_hide == test['expected']:
                    print(f"    ✅ PASS")
                    passed += 1
                else:
                    print(f"    ❌ FAIL - Expected hide={test['expected']}, got hide={should_hide}")
                    failed += 1
            else:
                print(f"    ❌ FAIL - HTTP {response.status_code}")
                failed += 1
        except Exception as e:
            print(f"    ❌ ERROR: {e}")
            failed += 1
    
    print(f"\n📊 Results: {passed} passed, {failed} failed")
    return failed == 0

def test_emoji_filtering():
    """Test emoji detection"""
    print_section("TEST 2: Emoji Filtering (3+ Angry Emojis)")
    
    test_cases = [
        {
            "text": "This is bad 🤬🤬😡😡😡",
            "expected": True,
            "emoji_count": 5
        },
        {
            "text": "I'm so angry 😡😡🖕",
            "expected": True,
            "emoji_count": 3
        },
        {
            "text": "Just one emoji 😀",
            "expected": False,
            "emoji_count": 0
        },
        {
            "text": "Two angry emojis 😡😡",
            "expected": False,
            "emoji_count": 2
        }
    ]
    
    passed = 0
    failed = 0
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n[{i}] Testing: \"{test['text']}\"")
        print(f"    Expected to hide: {test['expected']}")
        print(f"    Angry emojis: {test['emoji_count']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/analyze-comment",
                json={"text": test['text']},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                should_hide = result.get("hide", False)
                
                print(f"    Backend says: hide={should_hide}")
                print(f"    Reason: {result.get('reason', 'N/A')}")
                
                if should_hide == test['expected']:
                    print(f"    ✅ PASS")
                    passed += 1
                else:
                    print(f"    ❌ FAIL")
                    failed += 1
            else:
                print(f"    ❌ FAIL - HTTP {response.status_code}")
                failed += 1
        except Exception as e:
            print(f"    ❌ ERROR: {e}")
            failed += 1
    
    print(f"\n📊 Results: {passed} passed, {failed} failed")
    return failed == 0

def test_log_hidden_comment():
    """Test logging hidden comments to database"""
    print_section("TEST 3: Log Hidden Comment to Database")
    
    test_comment = {
        "child_id": "test-child-123",
        "post_url": "https://facebook.com/post/12345",
        "post_title": "Test Facebook Post",
        "comment_text": "Mug k ho yesto mugi randi 🤬😡🖕",
        "reason": "Contains Nepali toxic words and angry emojis",
        "severity": 2,
        "domain": "facebook.com"
    }
    
    print(f"Logging comment: {test_comment['comment_text'][:50]}...")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/comments/hidden",
            json=test_comment,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ PASS: Comment logged successfully")
            return True
        else:
            print("❌ FAIL")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_activity_logging():
    """Test logging site visits"""
    print_section("TEST 4: Log Site Visit (Cross-Device Sync Test)")
    
    test_activity = {
        "child_id": "test-child-123",
        "type": "site_visit",
        "domain": "youtube.com",
        "title": "YouTube - Watch Videos",
        "duration": 300,  # 5 minutes
        "flagged": False
    }
    
    print(f"Logging site visit: {test_activity['domain']}")
    print(f"Duration: {test_activity['duration']} seconds")
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/logs/history",
            json=test_activity,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ PASS: Activity logged successfully")
            print("\n💡 NOTE: This data will be visible on ANY device logged in")
            print("   with the same parent account (sandeshkadel2314@gmail.com)")
            print("   as long as they share the same child_id")
            return True
        else:
            print("❌ FAIL")
            return False
    except Exception as e:
        print(f"❌ ERROR: {e}")
        return False

def test_mixed_words():
    """Test combinations of English + Nepali + Emojis"""
    print_section("TEST 5: Mixed Language & Emojis (Real-World Test)")
    
    test_cases = [
        {
            "text": "You stupid mug what kasto video ho yo 😡😡🤬",
            "expected": True,
            "description": "English + Nepali + Emojis"
        },
        {
            "text": "Great video mugi! Very kasto informative 👍👍",
            "expected": True,
            "description": "Positive emoji but toxic Nepali word"
        },
        {
            "text": "Normal comment kasari hola k ho esto",
            "expected": True,
            "description": "Contains 'kasto' (toxic word)"
        },
        {
            "text": "Nice content बहु राम्रो छ",
            "expected": False,
            "description": "Safe Nepali comment"
        }
    ]
    
    passed = 0
    failed = 0
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n[{i}] {test['description']}")
        print(f"    Text: \"{test['text']}\"")
        print(f"    Expected hide: {test['expected']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/analyze-comment",
                json={"text": test['text']},
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                result = response.json()
                should_hide = result.get("hide", False)
                
                print(f"    Result: hide={should_hide}, reason={result.get('reason')}")
                
                if should_hide == test['expected']:
                    print(f"    ✅ PASS")
                    passed += 1
                else:
                    print(f"    ❌ FAIL")
                    failed += 1
            else:
                print(f"    ❌ FAIL - HTTP {response.status_code}")
                failed += 1
        except Exception as e:
            print(f"    ❌ ERROR: {e}")
            failed += 1
    
    print(f"\n📊 Results: {passed} passed, {failed} failed")
    return failed == 0

def explain_cross_device_sync():
    """Explain how cross-device sync works"""
    print_section("HOW CROSS-DEVICE SYNC WORKS")
    
    print("""
╔════════════════════════════════════════════════════════════════════════╗
║  CROSS-DEVICE DATA SYNCHRONIZATION                                     ║
╚════════════════════════════════════════════════════════════════════════╝

HOW IT WORKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PARENT ACCOUNT LOGIN
   • Login with: sandeshkadel2314@gmail.com
   • Backend generates: parent_id (unique)
   • Backend issues: JWT token

2. DEVICE SETUP (Each Device)
   • Device A: Logs in with sandeshkadel2314@gmail.com
   • Device B: Logs in with sandeshkadel2314@gmail.com
   • Both get same parent_id from backend

3. CHILD PROFILE CREATION
   • Parent creates child profile: "John's Account"
   • Backend generates: child_id (unique)
   • Both devices link to same child_id

4. DATA STORAGE
   • All data stored with child_id:
     ├─ Site visits → activity_logs table (child_id)
     ├─ Hidden comments → hidden_comments table (child_id)
     ├─ Video tracking → tracked_videos table (child_id)
     └─ Usage stats → user_behavior_profiles table (child_id)

5. DATA RETRIEVAL (Parent Dashboard)
   • Device A queries: GET /api/usage/{child_id}
   • Device B queries: GET /api/usage/{child_id}
   • Both get SAME data (same child_id!)

REQUIREMENTS FOR SYNC:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Same parent email (sandeshkadel2314@gmail.com)
✅ Same backend URL (http://localhost:8000 or IP address)
✅ Same WiFi/Network (if using local IP)
✅ Extension installed on both devices
✅ Logged in on both devices

DATA THAT SYNCS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ YouTube visits from Device A → Visible on Device B dashboard
✅ Hidden comments from Device A → Visible on Device B dashboard
✅ Video tracking from Device A → Visible on Device B dashboard
✅ Usage statistics from Device A → Visible on Device B dashboard
✅ Blocked sites from Device A → Synced to Device B
✅ Time limits from Device A → Applied on Device B

IMPORTANT NOTES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Different Google accounts on devices: NO PROBLEM!
   → Devices can have different Chrome profiles
   → As long as both login to extension with same parent email

⚠️  Backend URL must be reachable from both devices
   → Local: http://localhost:8000 (same computer only)
   → Network: http://192.168.x.x:8000 (same WiFi)

⚠️  Data updates every 20 seconds (real-time sync)
   → Device A visits YouTube
   → After 20 seconds → Data sent to backend
   → Device B refreshes dashboard → Sees YouTube visit

TESTING CROSS-DEVICE SYNC:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Device A: Login with sandeshkadel2314@gmail.com
2. Device B: Login with sandeshkadel2314@gmail.com
3. Device A: Visit YouTube for 1 minute
4. Device A: Post toxic comment on Facebook
5. Device B: Open Parent Dashboard
6. Device B: Click "Usage & Limits" → Should see YouTube
7. Device B: Click "Hidden Comments" → Should see Facebook comment

╚════════════════════════════════════════════════════════════════════════╝
""")

def main():
    """Run all tests"""
    print("\n")
    print("╔" + "="*78 + "╗")
    print("║" + " "*20 + "SAFEGUARD FAMILY - COMPREHENSIVE TEST" + " "*21 + "║")
    print("╚" + "="*78 + "╝")
    print("\nBackend URL:", BASE_URL)
    print("Test Date:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("\nTesting: Nepali words, emojis, hidden comments, cross-device sync")
    
    print("\n" + "─"*80)
    print("PREREQUISITES CHECK:")
    print("─"*80)
    
    # Test backend connectivity
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        health = response.json()
        print(f"✅ Backend running: {health.get('status')}")
        print(f"✅ Version: {health.get('version')}")
        print(f"✅ Features: {', '.join(health.get('features', []))}")
    except Exception as e:
        print(f"❌ Backend not reachable: {e}")
        print("\n⚠️  Please start backend first: python backend_final.py")
        return
    
    # Run all tests
    results = []
    
    results.append(("Nepali Words Filtering", test_comment_filter_nepali()))
    results.append(("Emoji Detection", test_emoji_filtering()))
    results.append(("Log Hidden Comment", test_log_hidden_comment()))
    results.append(("Log Site Visit", test_activity_logging()))
    results.append(("Mixed Language Test", test_mixed_words()))
    
    # Show cross-device sync explanation
    explain_cross_device_sync()
    
    # Summary
    print_section("FINAL SUMMARY")
    
    passed = sum(1 for _, result in results if result)
    failed = len(results) - passed
    
    print(f"\nTotal Tests: {len(results)}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    
    print("\n" + "─"*80)
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    print("─"*80)
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
        print("\n✅ READY FOR PRESENTATION!")
        print("\nNext Steps:")
        print("1. Reload Chrome extension (chrome://extensions)")
        print("2. Go to Facebook and test on real posts")
        print("3. Post toxic Nepali comments to verify hiding")
        print("4. Check Parent Dashboard for hidden comments")
        print("5. Test cross-device sync with second device")
    else:
        print("\n⚠️  SOME TESTS FAILED")
        print("Review the output above for details.")

if __name__ == "__main__":
    main()
