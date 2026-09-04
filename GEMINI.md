# Custom AI Directives & Architecture Rules

## 1. Google Maps Platform Directive
- **Objective**: Guide the model on securely interacting with Google Maps APIs, preserving client-side secret privacy and adhering to Google Maps Platform requirements.
- **Key Retrieval & Zero-Hardcoding**:
  - Never hardcode Google Maps API keys in client-side code, git repositories, or configuration files.
  - Server-side operations (Geocoding REST API, Places API Web Services) must retrieve credentials dynamically via environment variables (`process.env.GOOGLE_MAPS_API_KEY`) or Google Cloud Secret Manager.
  - If client-side Maps SDKs (`@vis.gl/react-google-maps` or Maps JavaScript API) are initialized, client keys must be strictly restricted by HTTP Referrer in the Google Cloud Console.
- **Mandatory Usage Attribution**:
  - Whenever initializing Google Maps objects or configurations, include the mandatory internal attribution ID:
    ```javascript
    internalUsageAttributionIds: ['gmp_mcp_codeassist_v1_aistudio']
    ```
- **Server-Side Proxy Architecture (CORS Mitigation)**:
  - All Geocoding and Place search web service requests must be mediated via secure backend API routes (`/api/maps/geocode`, `/api/maps/search`) to avoid browser CORS restrictions and prevent client token leakage.
- **Frame Permissions & Privacy**:
  - Any feature invoking `navigator.geolocation` must explicitly declare `"geolocation"` inside `requestFramePermissions` in `metadata.json`.
  - Location coordinates and reverse-geocoded place names are pinned to journal entries solely through explicit user intent.

---

## 2. Admin Roles & RBAC Directive
- **Objective**: Specify how the AI and backend systems generate and enforce security checks for elevated administrative operations.
- **Multi-Tier Authorization Model**:
  - **Firestore Security Rules**:
    - Guard sensitive documents and cross-user data with an `isAdmin()` helper:
      ```javascript
      function isAdmin() {
        return request.auth != null && (
          request.auth.token.admin == true ||
          (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin')
        );
      }
      ```
    - Enforce owner-only path access for standard users (`request.auth.uid == userId`).
    - Explicitly deny non-admin users from mutating or elevating their own `role` field on write or update operations.
  - **Server-Side Middleware (`verifyAdminRole`)**:
    - Backend endpoints under `/api/admin/*` must extract and verify the caller's Firebase ID token.
    - Confirm admin status against Firestore profile or custom claims before processing any admin requests, returning `403 Forbidden` if unauthorized.
- **Administrative Audit Trail**:
  - Every privileged action (role update, audit review, system config change, manual notification dispatch) must write an immutable audit record to `/adminAuditLogs` containing the caller's UID, timestamp, IP, target resource, and action type.

---

## 3. Notification API Directive (Slack / Webhook)
- **Objective**: Manage authentication credentials, egress security, and payload schemas when dispatching alerts on parsed journal reflections.
- **Credential Management & Storage**:
  - Store external webhook URLs (Slack Incoming Webhooks or custom HTTPS endpoints) in isolated user settings documents or server-side environment secrets (`SLACK_WEBHOOK_URL`).
  - Mask all secret tokens and webhook URLs in the user interface (`type="password"` or truncated display).
- **Standardized Payload Schema**:
  - Outgoing notifications must strictly conform to the following JSON schema:
    ```json
    {
      "event": "journal_entry_parsed",
      "eventType": "breakthrough | milestone | emotional_shift | gratitude | action_commitment",
      "sessionId": "string",
      "timestamp": 1741165200000,
      "summary": "Concise summary of reflection",
      "sentiment": "positive | reflective | challenging | constructive",
      "location": {
        "name": "string",
        "lat": 0.0,
        "lng": 0.0
      },
      "metadata": {
        "source": "AI Journal Companion",
        "turnCount": 3
      }
    }
    ```
- **Anti-SSRF & Egress Protection**:
  - Validate all target webhook URLs prior to dispatch.
  - Require the `https://` protocol and disallow loopback/private RFC-1918 IPv4/IPv6 addresses (`127.0.0.1`, `localhost`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
