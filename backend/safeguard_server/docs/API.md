# 📚 API Documentation - SafeGuard Family Backend

Complete API reference for the SafeGuard Family backend server.

---

## Base URL

```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

---

## Authentication

Most endpoints require authentication using JWT tokens.

### Get Token
```http
POST /api/parent/login
```

Use the returned token in subsequent requests:
```http
Authorization: Bearer your-jwt-token-here
```

---

## API Endpoints

### 1. URL Classification

#### Classify URL
Check if a URL should be blocked.

**Endpoint:** `POST /api/classify`

**Request Body:**
```json
{
  "url": "https://example.com/page",
  "childId": "child_1234567890_abc123"
}
```

**Response:**
```json
{
  "blocked": true,
  "category": "Adult",
  "confidence": 0.9,
  "matchedKeyword": "adult"
}
```

**Status Codes:**
- `200`: Success
- `400`: Invalid request
- `500`: Server error

---

#### Get Blocklist
Get the blocklist for a specific child.

**Endpoint:** `GET /api/blocklist/:childId`

**Parameters:**
- `childId` (path): Child's unique ID

**Response:**
```json
{
  "blocklist": [
    {
      "domain": "example-blocked.com",
      "category": "Adult"
    }
  ],
  "settings": {
    "blockAdult": true,
    "blockGambling": true,
    "blockViolence": true
  }
}
```

---

### 2. Alert Management

#### Log Blocked Site
Record a blocked website attempt.

**Endpoint:** `POST /api/alerts/blocked`

**Request Body:**
```json
{
  "childId": "child_1234567890_abc123",
  "childName": "John",
  "parentEmail": "parent@example.com",
  "url": "https://blocked-site.com",
  "category": "Adult",
  "timestamp": "2024-01-15T12:30:00Z",
  "action": "BLOCKED"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Alert logged successfully",
  "alertId": "507f1f77bcf86cd799439011"
}
```

**Side Effects:**
- Saves to database
- Triggers email notification
- Triggers ESP32 alert

**Status Codes:**
- `200`: Success
- `400`: Missing required fields
- `500`: Server error

---

#### Get Alert Count
Get the number of blocked sites for a specific period.

**Endpoint:** `GET /api/alerts/count`

**Query Parameters:**
- `childId` (optional): Filter by child
- `date` (optional): Date in YYYY-MM-DD format

**Example:**
```
GET /api/alerts/count?childId=child_123&date=2024-01-15
```

**Response:**
```json
{
  "count": 5
}
```

---

#### Get Recent Alerts
Get a list of recent blocked sites.

**Endpoint:** `GET /api/alerts/recent`

**Query Parameters:**
- `childId` (optional): Filter by child
- `limit` (optional): Number of results (default: 20)

**Example:**
```
GET /api/alerts/recent?childId=child_123&limit=10
```

**Response:**
```json
{
  "count": 10,
  "alerts": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "childId": "child_123",
      "childName": "John",
      "url": "https://blocked-site.com",
      "domain": "blocked-site.com",
      "category": "Adult",
      "action": "BLOCKED",
      "timestamp": "2024-01-15T12:30:00Z",
      "emailSent": true,
      "esp32Triggered": true
    }
  ]
}
```

---

#### Get Statistics
Get statistical analysis of blocked sites.

**Endpoint:** `GET /api/alerts/stats`

**Query Parameters:**
- `childId` (optional): Filter by child
- `startDate` (optional): Start date
- `endDate` (optional): End date

**Response:**
```json
{
  "totalBlocked": 45,
  "categoryStats": [
    { "_id": "Adult", "count": 20 },
    { "_id": "Gambling", "count": 15 },
    { "_id": "Violence", "count": 10 }
  ],
  "dailyTrend": [
    { "_id": "2024-01-10", "count": 5 },
    { "_id": "2024-01-11", "count": 8 }
  ]
}
```

---

### 3. Parent Account Management

#### Register Parent
Create a new parent account and associate a child.

**Endpoint:** `POST /api/parent/register`

**Request Body:**
```json
{
  "parentEmail": "parent@example.com",
  "passwordHash": "hashed-password-string",
  "childId": "child_1234567890_abc123",
  "childName": "John",
  "setupDate": "2024-01-15T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "parentId": "507f1f77bcf86cd799439011",
  "childId": "child_1234567890_abc123"
}
```

**Status Codes:**
- `200`: Success
- `400`: Missing fields or child already registered
- `500`: Server error

---

#### Parent Login
Authenticate a parent and get JWT token.

**Endpoint:** `POST /api/parent/login`

**Request Body:**
```json
{
  "email": "parent@example.com",
  "passwordHash": "hashed-password-string"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "parent": {
    "email": "parent@example.com",
    "children": [
      {
        "childId": "child_123",
        "childName": "John",
        "setupDate": "2024-01-15T10:00:00Z",
        "active": true
      }
    ],
    "settings": {
      "emailNotifications": true,
      "esp32Alerts": true,
      "dataRetentionDays": 30
    }
  }
}
```

**Status Codes:**
- `200`: Success
- `401`: Invalid credentials
- `500`: Server error

---

#### Get Dashboard Data
Get comprehensive dashboard data for a child.

**Endpoint:** `GET /api/parent/dashboard/:childId`

**Parameters:**
- `childId` (path): Child's unique ID

**Response:**
```json
{
  "child": {
    "childId": "child_123",
    "childName": "John",
    "setupDate": "2024-01-15T10:00:00Z",
    "lastActive": "2024-01-20T15:00:00Z"
  },
  "stats": {
    "todayCount": 3,
    "totalBlocked": 45,
    "categoryBreakdown": [
      { "_id": "Adult", "count": 20 }
    ]
  },
  "recentBlocks": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "domain": "blocked-site.com",
      "category": "Adult",
      "timestamp": "2024-01-20T14:30:00Z"
    }
  ],
  "customBlocklist": [
    {
      "domain": "custom-blocked.com",
      "category": "Other",
      "addedAt": "2024-01-18T10:00:00Z",
      "reason": "Parent added"
    }
  ],
  "customAllowlist": [
    {
      "domain": "educational-site.com",
      "addedAt": "2024-01-17T09:00:00Z",
      "reason": "Homework site"
    }
  ],
  "settings": {
    "blockAdult": true,
    "blockGambling": true,
    "blockViolence": true
  }
}
```

---

#### Add to Blocklist
Add a domain to the custom blocklist.

**Endpoint:** `POST /api/parent/blocklist/add`

**Request Body:**
```json
{
  "childId": "child_123",
  "domain": "block-this-site.com",
  "category": "Other",
  "reason": "Parent decision"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Domain added to blocklist"
}
```

**Status Codes:**
- `200`: Success
- `400`: Domain already in list or invalid request
- `404`: Child not found
- `500`: Server error

---

#### Add to Allowlist
Add a domain to the custom allowlist.

**Endpoint:** `POST /api/parent/allowlist/add`

**Request Body:**
```json
{
  "childId": "child_123",
  "domain": "trusted-site.com",
  "reason": "Educational site"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Domain added to allowlist"
}
```

---

## Data Models

### BlockedSite Schema
```javascript
{
  "_id": ObjectId,
  "childId": String (required, indexed),
  "childName": String (required),
  "parentEmail": String (required),
  "url": String (required),
  "domain": String (required),
  "category": String (required, enum: ['Adult', 'Gambling', 'Violence', 'Drugs', 'Hate', 'Malware', 'Phishing', 'Other']),
  "action": String (enum: ['BLOCKED', 'WARNED', 'ALLOWED'], default: 'BLOCKED'),
  "timestamp": Date (default: Date.now, indexed),
  "emailSent": Boolean (default: false),
  "esp32Triggered": Boolean (default: false),
  "userAgent": String,
  "ipAddress": String,
  "createdAt": Date,
  "updatedAt": Date
}
```

### Parent Schema
```javascript
{
  "_id": ObjectId,
  "email": String (required, unique, lowercase),
  "passwordHash": String (required),
  "children": [
    {
      "childId": String (required, unique),
      "childName": String (required),
      "setupDate": Date (default: Date.now),
      "active": Boolean (default: true)
    }
  ],
  "emailNotifications": Boolean (default: true),
  "esp32Alerts": Boolean (default: true),
  "dataRetentionDays": Number (default: 30),
  "createdAt": Date,
  "lastLogin": Date
}
```

### Child Schema
```javascript
{
  "_id": ObjectId,
  "childId": String (required, unique, indexed),
  "childName": String (required),
  "parentEmail": String (required, indexed),
  "customBlocklist": [
    {
      "domain": String,
      "category": String,
      "addedAt": Date (default: Date.now),
      "reason": String
    }
  ],
  "customAllowlist": [
    {
      "domain": String,
      "addedAt": Date (default: Date.now),
      "reason": String
    }
  ],
  "settings": {
    "blockAdult": Boolean (default: true),
    "blockGambling": Boolean (default: true),
    "blockViolence": Boolean (default: true),
    "blockDrugs": Boolean (default: true),
    "blockHate": Boolean (default: true),
    "safeSearch": Boolean (default: true)
  },
  "active": Boolean (default: true),
  "setupDate": Date (default: Date.now),
  "lastActive": Date (default: Date.now),
  "createdAt": Date,
  "updatedAt": Date
}
```

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description",
  "details": "Additional details (only in development)"
}
```

**Common Status Codes:**
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing or invalid token)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error
- `503`: Service Unavailable (database connection issue)

---

## Rate Limiting

**Limits:**
- 100 requests per minute per IP address
- Applies to all `/api/` endpoints

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642273200
```

**Rate Limit Exceeded Response:**
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

Status Code: `429 Too Many Requests`

---

## CORS Policy

**Allowed Origins:**
- `http://localhost:3000`
- `chrome-extension://*` (all Chrome extensions)
- Configured `FRONTEND_URL` from environment

**Allowed Methods:**
- GET, POST, PUT, DELETE

**Credentials:**
- Allowed

---

## Security Headers

The API includes these security headers:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## Testing the API

### Using cURL

**Classify URL:**
```bash
curl -X POST http://localhost:3000/api/classify \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","childId":"child_123"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/parent/login \
  -H "Content-Type: application/json" \
  -d '{"email":"parent@example.com","passwordHash":"hash"}'
```

### Using Postman

1. Import API endpoints from this documentation
2. Set base URL: `http://localhost:3000/api`
3. For protected endpoints, add Authorization header:
   - Key: `Authorization`
   - Value: `Bearer your-jwt-token`

---

## Websocket Support (Future)

*Not implemented in current version.*

Future versions may include WebSocket support for real-time alerts:
```
ws://localhost:3000/ws/alerts?childId=child_123
```

---

## API Versioning

Current version: **v1** (implicit in URLs)

Future versions will use explicit versioning:
```
/api/v2/classify
```

---

## Changelog

### Version 1.0.0 (January 2024)
- Initial release
- URL classification endpoint
- Alert logging and retrieval
- Parent authentication
- Dashboard data endpoint
- Blocklist/allowlist management

---

For more information, see:
- [Setup Guide](SETUP_GUIDE.md)
- [Security Documentation](SECURITY.md)
- [Main README](../README.md)
