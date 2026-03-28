# Deployment & Configuration Guide

## Current Status

✅ **FIXED:**
- Firebase Admin JSON parsing error (escape sequences now properly handled)
- Port 3000 conflict
- Server starts successfully

⏳ **PENDING:**
- Firestore security rules deployment
- Application testing

---

## Step 1: Deploy Firestore Security Rules

### Option A: Using Firebase CLI (Recommended)

```bash
# 1. Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# 2. Login to Firebase
firebase login

# 3. From the Manuscale project directory, deploy the rules
firebase deploy --only firestore:rules --project gen-lang-client-0724614586
```

### Option B: Using Firebase Console

1. Go to https://console.firebase.google.com/
2. Select your project: **gen-lang-client-0724614586**
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab
5. Click **Edit rules**
6. Copy the contents of [firestore.rules](firestore.rules)
7. Paste into the rules editor (replacing any existing rules)
8. Click **Publish**

### How the Rules Work

The new security rules allow:

- ✅ **Authenticated users** can read their own user profile document
- ✅ **Authenticated users** can write to their own user profile document  
- ✅ **Firebase Admin SDK** (server-side) can write subscription updates (bypasses rules)
- ❌ **Everyone else** gets denied access

**Example workflow:**
1. User logs in → Firebase Authentication grants JWT token
2. Client requests user profile → Firestore checks if `auth.uid == userId` → Allowed ✅
3. Stripe webhook updates subscription → Uses Admin SDK on server → Bypasses rules ✅

---

## Step 2: Test the Application

After deploying the Firestore rules:

```bash
# Start the development server
npm run dev
```

Navigate to http://localhost:3000 and test:

### Test Checklist

- [ ] **Sign Up**: Create a new account with email/password
- [ ] **Email Verification**: Verify email if prompted
- [ ] **Login**: Sign in successfully
- [ ] **User Profile**: Page loads without permission errors
- [ ] **Dashboard**: Projects page loads
- [ ] **Create Project**: Can create a new project
- [ ] **Subscription**: Billing portal works (if testing checkout)

### Expected Console Messages

**Good signs:**
- ✓ Firebase Admin initialized with service account
- ✓ User profile fetched successfully (browser console)
- Ready in 335ms (server startup)

**Bad signs:**
- ✗ "Missing or insufficient permissions"
- ✗ "Failed to parse Firebase service account JSON"
- ✗ Port errors

---

## Step 3: Monitor & Debug

### Check Firestore Rules Deployment

In Firebase Console:
1. Go to **Firestore Database** → **Rules**
2. Verify the rules are published (bottom right shows "✓ Published")
3. Timestamp shows when last deployed

### Monitor Real-Time Activity

```bash
# Watch server logs for errors
npm run dev

# In another terminal, monitor Firebase activity:
# Go to Firebase Console → Firestore Database → Logs
```

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "Missing or insufficient permissions" | Rules not deployed | Deploy rules following Step 1 |
| "Failed to parse Firebase service account" | .env.local issue | Verify `FIREBASE_ADMIN_SERVICE_ACCOUNT` is set correctly |
| 401 errors on billing | Token verification failed | Check Admin SDK initialization in `services/firebaseAdmin.ts` |
| EADDRINUSE on port 3000 | Another process using port | Run `lsof -ti:3000 \| xargs kill -9` |

---

## Files Modified in This Fix

### [services/firebaseAdmin.ts](services/firebaseAdmin.ts)
- Enhanced escape sequence handling for environment variable JSON parsing
- Now handles `\n`, `\r`, `\t`, `\"`, and `\\` escape sequences

### [firestore.rules](firestore.rules) *(NEW)*
- Created Firestore security rules file
- Defines read/write permissions for authenticated users
- Must be deployed to Firebase to take effect

### [FIX_SUMMARY.md](FIX_SUMMARY.md) *(NEW)*
- Summary of all issues fixed and their solutions

---

## Environment Variables Reference

Make sure `.env.local` has these required variables:

```env
# Firebase Authentication
NEXT_PUBLIC_FIREBASE_API_KEY=<your-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=gen-lang-client-0724614586.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=gen-lang-client-0724614586

# Firebase Admin SDK (Server-side only)
FIREBASE_ADMIN_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_ADMIN_PROJECT_ID=gen-lang-client-0724614586

# Gemini API
GEMINI_API_KEY=<your-key>

# Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Architecture Notes

### Client-Side (Browser)
- Uses Firestore Security Rules
- Cannot bypass rules
- Subject to rule-based access control

### Server-Side (Node.js)
- Uses Firebase Admin SDK
- Bypasses Firestore Security Rules
- Has full database access
- Used for Stripe webhooks, token verification, etc.

### Authentication Flow
```
1. User logs in with Firebase Auth
2. Client receives JWT token (ID token)
3. Client includes token in API requests
4. Server verifies token with App.verifyIdToken()
5. Server uses Admin SDK to access Firestore
6. Client receives ID token for Firestore access
7. Client sends token with Firestore requests
8. Firestore Rules validate client token
```

---

## Support

If issues persist after deploying the rules:

1. Check browser console for error details
2. Check Firebase Console → Firestore → Logs for permission denials
3. Verify `.env.local` has correct values
4. Ensure Firestore rules are published (not in draft)
5. Try clearing browser cache and restarting the dev server

For the Stripe integration to work:
- Ensure webhook endpoint is correctly configured in Stripe dashboard
- Webhook must be accessible from the public internet
- Verify webhook secret matches `STRIPE_WEBHOOK_SECRET`
