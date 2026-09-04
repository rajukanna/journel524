# AI Journal — Reflective Multi-Turn Companion

A secure, private, user-authenticated journaling web application. Signed-in users engage in multi-turn reflective conversations with Google Gemini to explore their thoughts, untangle complex emotions, and extract personal insights. All reflections, turns, and metadata are persisted in Cloud Firestore with strict per-user database isolation (`/users/{uid}/*`).

---

## Architecture & Security Highlights

1. **Per-User Firestore Isolation**: Enforced at the database security rules layer. No user can read, query, or mutate another user's journal entries.
2. **Zero Client Secrets**: The Gemini API key is stored exclusively on the server (or injected via Google Secret Manager) and never exposed to the client bundle.
3. **Verified Authentication Proxy**: The server-side API validates the caller's Firebase ID token via Google Identity Toolkit before processing reflections or interacting with Gemini.
4. **Resilient Model Fallback Ladder**: The AI service wraps calls with an automatic fallback ladder (`gemini-3.6-flash` → `gemini-3.1-flash-lite` → `gemini-flash-latest` → `gemini-3.7-flash`), gracefully catching transient API limits (`503`, `429`, `500`).
5. **Non-Clinical Guardrails**: Explicit system instructions position the assistant as a reflective companion rather than a clinical medical advisor.

---

## 1. Environment & Prerequisites

Ensure the following Google Cloud services and command-line tools are available:
- **Google Cloud SDK (`gcloud` CLI)** installed and authenticated.
- **Node.js 20+** and **npm**.
- Google Cloud Project with the following APIs enabled:
  ```bash
  gcloud services enable \
    run.googleapis.com \
    secretmanager.googleapis.com \
    firestore.googleapis.com \
    identitytoolkit.googleapis.com
  ```

---

## 2. Secret Management Setup

Create the `GEMINI_API_KEY` in Google Cloud Secret Manager and grant the Cloud Run runtime service account access:

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
export PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
gcloud config set project $PROJECT_ID

# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 3. Database Security Configuration (Firestore Security Rules)

The application enforces per-user isolation using Firestore Security Rules deployed to the project:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Challenge verification match path
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Complete isolated per-user journaling tree
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules via the Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

---

## 4. Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env`:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   ```
3. Start the unified development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 5. Cloud Run Deployment

Build and deploy the application container directly to Cloud Run:

```bash
# Deploy service to Cloud Run
gcloud run deploy ai-journal \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="GEMINI_API_KEY=GEMINI_API_KEY:latest"
```

### Mandatory Campaign Labeling
To register the service for automated challenge verification:

```bash
gcloud run services update ai-journal \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 6. Functional Verification Walkthrough (Test Cases)

Every user interaction that can be triggered in the UI is documented below for automated or manual end-to-end verification:

### Test Case 1: Unauthenticated Guarding & Landing Flow
- **Step 1.1**: Open the root URL (`/`) without an active session.
- **Expected Outcome**: The user is presented with the public landing page showcasing the reflective companion features and the "Continue with Google" button. Direct access to `/dashboard` or private entries is guarded and prevented.
- **Step 1.2**: Click the "Continue with Google" button (`#btn-google-signin`).
- **Expected Outcome**: The Firebase Authentication Google Sign-In popup opens. Upon successful credential authentication, the auth state transitions to authenticated and redirects to the Reflective Studio.

### Test Case 2: Session Creation & Prompt Starter Interaction
- **Step 2.1**: In the empty Studio, view the prompt starter cards (`INSPIRATION_PROMPTS`).
- **Expected Outcome**: 5 mindful prompt invitations are displayed (e.g., "What is currently consuming the most space in your thoughts?").
- **Step 2.2**: Click one of the prompt starter cards.
- **Expected Outcome**: The input textarea (`#journal-input-textarea`) is populated with the prompt and focused.

### Test Case 3: Multi-Turn Conversation & Database Persistence
- **Step 3.1**: Type a personal reflection into `#journal-input-textarea` and click "Reflect" (`#btn-journal-send`) or press `Cmd/Ctrl + Enter`.
- **Expected Outcome**: 
  1. The user reflection immediately renders as a message card.
  2. The reflection is written to Firestore at `/users/{uid}/sessions/{sessionId}/messages/{messageId}`.
  3. The animated companion typing indicator appears ("Companion is reflecting...").
  4. The server receives the request with the Bearer ID token, passes conversation history to Gemini (`gemini-3.6-flash`), and returns the companion response.
  5. The companion reply is rendered with markdown styling and saved to Firestore.
  6. An evocative session title and summary are auto-generated and updated on the session document.

### Test Case 4: Follow-up Turn (Contextual Continuity)
- **Step 4.1**: Type a follow-up answer or reflection in the same session and send.
- **Expected Outcome**: The companion's response references prior context from turn 1, asks an appropriate follow-up question, and increments the session's `turnCount`.

### Test Case 5: Inline Title Editing
- **Step 5.1**: Click the pencil icon next to the session title in the Studio header.
- **Expected Outcome**: The title transforms into an input field.
- **Step 5.2**: Change the title to "Evening Introspection" and press Enter or click the checkmark.
- **Expected Outcome**: The new title is saved to Firestore and updated across the UI and Archive view.

### Test Case 6: AI Session Synthesis / Summarize
- **Step 6.1**: With at least 2 turns in the active session, click "Summarize" (`#btn-summarize-session`).
- **Expected Outcome**: The button shows "Synthesizing...", calls `/api/journal/summarize`, and updates the session's subtitle/summary in Firestore.

### Test Case 7: Markdown Export
- **Step 7.1**: Click the download icon (`#btn-export-session`) in either the Studio header or Archive card.
- **Expected Outcome**: A timestamped `.md` file (e.g. `evening-introspection-<timestamp>.md`) downloads containing the formatted session header, dates, summary, and dialogue turns.

### Test Case 8: Journal Archive & Keyword Search
- **Step 8.1**: Click the "Archive" tab (`#tab-btn-archive`) in the navigation bar.
- **Expected Outcome**: The list displays all saved sessions sorted newest first, showing title, date, turn count, and summary.
- **Step 8.2**: Type a keyword in the search bar (`#input-archive-search`).
- **Expected Outcome**: The list immediately filters to matching sessions.
- **Step 8.3**: Click "Continue" on any session card.
- **Expected Outcome**: The application switches to the Studio tab with that session and its full message history loaded.

### Test Case 9: Session Deletion & Confirmation Guard
- **Step 9.1**: Click the trash icon (`#btn-delete-session` or card trash button).
- **Expected Outcome**: An accessible confirmation dialog (`#confirm-modal-backdrop`) opens with "Delete Reflection Session?".
- **Step 9.2**: Click "Cancel".
- **Expected Outcome**: The modal closes and the session remains intact.
- **Step 9.3**: Click the trash icon again and click "Delete Forever" (`#btn-modal-confirm`).
- **Expected Outcome**: The session and its subcollection messages are deleted from Firestore, the list updates, and the Studio resets to a fresh session.

### Test Case 10: Sign Out Flow
- **Step 10.1**: Click the sign out button (`#btn-nav-sign-out`) in the navigation header.
- **Expected Outcome**: Firebase session terminates, user state resets to `null`, and the public landing page is rendered.

### Test Case 11: Location-Aware Pinning (Google Maps Geocoding)
- **Step 11.1**: Inside an active reflection, click "Pin Location" (`#btn-pin-location-header` or `#btn-input-pin-location`).
- **Expected Outcome**: The Location Picker Modal opens with options to type an address or use device GPS.
- **Step 11.2**: Type "Golden Gate Park, San Francisco" and click Search (`#btn-search-location`).
- **Expected Outcome**: The server queries the Google Maps Geocoding API via the secure `/api/maps/geocode` proxy without exposing keys to the client, displays the formatted result, and enables the "Pin Location" button.
- **Step 11.3**: Click "Pin Location" (`#btn-save-location-pin`).
- **Expected Outcome**: The modal closes, a location badge with the pin icon appears on the session header, and the location is saved to Firestore. In the Archive view, the session card displays the location pill.

### Test Case 12: Slack Notifications (Incoming Webhook Alerting)
- **Step 12.1**: Click the Notifications icon in the navigation bar (`#btn-nav-notifications`).
- **Expected Outcome**: The Slack Integration Modal opens displaying toggles for Breakthroughs, Milestones, and Action Commitments, and a Slack Incoming Webhook URL input.
- **Step 12.2**: Paste a valid HTTPS Slack webhook URL (e.g., `https://hooks.slack.com/services/T000/B000/XXXX`), check "Breakthrough & Epiphany", and click "Save Slack Settings" (`#btn-save-notifications`).
- **Expected Outcome**: The settings are validated against anti-SSRF address filters and persisted to `/users/{uid}/settings/notifications`.
- **Step 12.3**: Write a journal entry describing a personal breakthrough or significant insight.
- **Expected Outcome**: Upon turn completion, the server-side classifier detects the breakthrough, executes the Slack Block Kit dispatch, and displays an insight celebration alert banner (`#banner-insight-alert`) in the Studio with "Breakthrough Detected - Alert Dispatched to Slack".

### Test Case 13: Admin Dashboard & Role-Based Access Control (RBAC)
- **Step 13.1**: Log in with an administrative account (or click "Grant Admin Role" in the demo badge).
- **Expected Outcome**: The "Admin" shield button (`#btn-nav-admin`) appears in the navigation bar.
- **Step 13.2**: Click the "Admin" button.
- **Expected Outcome**: The Admin Dashboard Modal opens with active telemetry cards (Total Users, Active Sessions, Total Journal Reflections, Dispatched Notifications), an Audit Logs viewer, and a Role Management panel.
- **Step 13.3**: Select a user, switch their role from `user` to `admin`, and confirm.
- **Expected Outcome**: The server processes the change via `/api/admin/set-role` with `verifyAdminRole` authorization, records an entry in `/adminAuditLogs`, and updates the user table.
