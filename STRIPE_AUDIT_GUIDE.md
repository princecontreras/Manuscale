# Stripe to Firestore Data Audit Guide

## Issue Diagnosis

Your Firestore shows incorrect `currentPeriodEnd` dates. To diagnose the root cause, follow these steps:

### Step 1: Get Your Test User's Email
The test account with the billing issue - what email is it?

### Step 2: Run the Admin Sync Endpoint
This will pull your subscription data directly from Stripe and update Firestore.

**Using cURL:**
```bash
curl -X POST https://your-domain.com/api/admin/sync-subscriptions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SYNC_ADMIN_KEY" \
  -d '{
    "email": "your-test-email@example.com",
    "verbose": true
  }'
```

Replace:
- `your-domain.com` with your app domain
- `YOUR_SYNC_ADMIN_KEY` with the value from your environment
- `your-test-email@example.com` with the test email

### Step 3: Check Server Logs

Look for console logs like:
```
[SYNC] Raw Stripe data for your-test-email@example.com:
{
  subscriptionId: "sub_...",
  current_period_start: 1713830400,
  current_period_start_date: "2026-04-23T00:00:00.000Z",
  current_period_end: 1716422400,
  current_period_end_date: "2026-05-23T00:00:00.000Z"
}
```

### Step 4: Compare with Firestore

After the sync completes, check your Firestore document for that user:
- Open Firestore Console
- Go to Collection: `users`
- Find your test user document
- Check the `currentPeriodEnd` field value

Compare:
- **Stripe says:** May 23, 2026 (in logs)
- **Firestore shows:** ??? (what do you see?)

### Step 5: Share Results

Please provide:

1. **Stripe subscription data** (from step 3 logs):
   - current_period_start timestamp: ___
   - current_period_start_date: ___
   - current_period_end timestamp: ___
   - current_period_end_date: ___

2. **Firestore data** (from step 4):
   - currentPeriodStart value: ___
   - currentPeriodEnd value: ___

3. **Actual billing info**:
   - What subscription plan? (monthly/yearly)
   - When did they subscribe?
   - What should next billing date be?

---

## Possible Issues We'll Identify

### Issue A: Stripe is returning wrong data
- **Sign:** Logs show current_period_end = same as current_period_start
- **Cause:** Stripe subscription configuration issue
- **Fix:** Check Stripe subscription directly in Stripe Dashboard

### Issue B: We're storing the wrong field
- **Sign:** Logs show correct data but Firestore has wrong value
- **Cause:** Code bug or merge issue
- **Fix:** We'll fix the code and re-sync

### Issue C: Old data not being updated
- **Sign:** Sync completes successfully but Firestore unchanged
- **Cause:** merge: true not working or field not updating
- **Fix:** Force clear old data and re-sync

### Issue D: Type conversion problem  
- **Sign:** Firestore value is a raw number instead of Date
- **Cause:** Not converting Unix timestamp to Date properly
- **Fix:** Add explicit type casting
