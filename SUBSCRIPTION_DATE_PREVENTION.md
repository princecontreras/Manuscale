# Subscription Date Prevention & Monitoring Guide

## Overview

This document outlines the preventive measures implemented to ensure subscription dates remain valid and to detect/fix issues early.

## Files Changed/Created

### 1. **Validation Utility** - New File
- **File:** `/utils/subscriptionValidation.ts`
- **Purpose:** Core validation logic for subscription dates
- **Functions:**
  - `validateSubscriptionDates()` - Validates both start and end dates
  - `logValidationWarnings()` - Logs validation issues with context
  - `areSubscriptionDatesLikelySwapped()` - Detects if dates are reversed
  - `suggestDateCorrection()` - Suggests which date might be wrong

### 2. **Webhook Handler** - Updated
- **File:** `/app/api/webhooks/stripe/route.ts`
- **Changes:**
  - Added validation after extracting dates from Stripe
  - Added logging for all validation issues
  - Three cases updated: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`

### 3. **Admin Sync Endpoint** - Updated
- **File:** `/app/api/admin/sync-subscriptions/route.ts`
- **Changes:**
  - Added validation in email-based sync
  - Added validation in bulk sync (syncAll)

### 4. **Plan Switch Endpoint** - Updated
- **File:** `/app/api/billing/switch-plan/route.ts`
- **Changes:**
  - Added validation when switching between monthly/yearly plans

### 5. **Monitoring Endpoint** - New Endpoint
- **Endpoint:** `GET /api/admin/monitor-subscriptions?adminKey=xxx&limit=100`
- **Purpose:** Scan all active subscriptions and report issues
- **Returns:** List of subscriptions with invalid dates and fix recommendations

### 6. **Bulk Fix Endpoint** - New Endpoint
- **Endpoint:** `POST /api/admin/bulk-fix-subscriptions`
- **Body:** `{ adminKey: "xxx", dryRun: true/false, limit: 100 }`
- **Purpose:** Automatically fix multiple subscriptions at once
- **Features:**
  - Dry-run mode to preview changes
  - Bulk processing with error handling
  - Logs all changes

### 7. **Individual Fix Endpoint** - Already Exists
- **Endpoint:** `GET /api/admin/fix-subscription-dates?email=user@example.com`
- **Purpose:** Fix a single user's subscription dates

## Validation Rules

The validation utility enforces these rules:

1. **Valid Dates:** Both start and end must be valid Date objects
2. **Proper Order:** End date MUST be after start date (minimum 1 day)
3. **Future End Date:** End date must be in the future (not expired)
4. **Reasonable Period:** Period should be 20-400 days (for monthly/yearly plans)
5. **Start Date Sanity:** Start date shouldn't be far in the future (max 1 day)

### Validation Issues Examples

```
"currentPeriodEnd must be at least 1 day after currentPeriodStart"
"currentPeriodEnd is in the past"
"Billing period is unusual: 1.0 days. Expected 20-400 days"
"currentPeriodStart is in the future by 5.0 days"
```

## Usage Guide

### Monitor All Subscriptions

```bash
curl "http://localhost:3000/api/admin/monitor-subscriptions?adminKey=YOUR_ADMIN_KEY&limit=100"
```

**Response includes:**
- Summary of total checked and issues found
- List of problematic subscriptions with details
- Direct link to fix each subscription

### Fix Single Subscription

```bash
curl "http://localhost:3000/api/admin/fix-subscription-dates?email=user@example.com"
```

### Preview Bulk Fix (Dry-Run)

```bash
curl -X POST "http://localhost:3000/api/admin/bulk-fix-subscriptions" \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"YOUR_ADMIN_KEY","dryRun":true,"limit":100}'
```

### Apply Bulk Fix

```bash
curl -X POST "http://localhost:3000/api/admin/bulk-fix-subscriptions" \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"YOUR_ADMIN_KEY","dryRun":false,"limit":100}'
```

## Logging & Debugging

All subscription date operations now log validation results:

```
[checkout.session.completed] ✓ Subscription dates valid
[checkout.session.completed] ⚠️ SUBSCRIPTION DATE VALIDATION FAILED
  - Validation Issues:
    - "currentPeriodEnd is in the past"
    - "Billing period is unusual: 1.0 days"
```

Check your logs for the `[context]` prefix to see where issues occur:
- `[checkout.session.completed]` - From Stripe checkout webhook
- `[customer.subscription.created]` - New subscription webhook
- `[customer.subscription.updated]` - Subscription update webhook
- `[switch-plan]` - Plan switching
- `[sync-subscriptions]` - Admin manual sync
- `[monitor-subscriptions]` - Monitoring scan
- `[bulk-fix-subscriptions]` - Bulk fixing

## Prevention Strategy

### At Data Entry (Non-Blocking)
1. When dates are written to Firestore (webhooks, sync, plan switch), they are validated
2. Any validation issues are **logged** (non-blocking)
3. Invalid dates are still written but flagged for investigation
4. This ensures we never miss data and can investigate failures

### At Display Time
1. `ProfilePage.tsx` already validates dates before displaying
2. Warns if dates appear invalid or mismatched

### At Monitoring Time
1. Admins can run the monitoring endpoint to find all problematic subscriptions
2. Each issue is linked to its fix endpoint
3. Bulk fix can be applied with dry-run preview

## Testing the Prevention System

### 1. Test Webhook Validation
When a new subscription is created via checkout:
- Check logs for `[checkout.session.completed] ✓ Subscription dates valid`
- Or `[checkout.session.completed] ⚠️ SUBSCRIPTION DATE VALIDATION FAILED` if dates are bad

### 2. Test Monitoring
```bash
curl "http://localhost:3000/api/admin/monitor-subscriptions?adminKey=test_key"
```

Should show:
```json
{
  "success": true,
  "checked": 5,
  "issuesFound": 0,
  "summary": {
    "totalScanned": 5,
    "problematic": 0,
    "healthy": 5
  }
}
```

### 3. Test Bulk Fix with Dry-Run
```bash
curl -X POST "http://localhost:3000/api/admin/bulk-fix-subscriptions" \
  -H "Content-Type: application/json" \
  -d '{"adminKey":"test_key","dryRun":true}'
```

Should show what would be fixed without making changes.

## Future Enhancements

1. **Automated Alerts:** Send notifications when validation issues are detected
2. **Webhook for Invalid Dates:** Create separate endpoint to handle recurring issues
3. **Automatic Recovery:** Automatically re-fetch from Stripe if dates seem invalid
4. **Dashboard Widget:** Show subscription health on admin dashboard
5. **Alert Threshold:** Only alert if X% of new subscriptions have issues

## Common Issues & Solutions

### Issue: "currentPeriodEnd is in the past"
**Cause:** Subscription data wasn't updated after renewal
**Solution:** Run fix endpoint: `/api/admin/fix-subscription-dates?email=user@example.com`

### Issue: "Billing period is unusual: 1.0 days"
**Cause:** Both start and end dates are the same
**Solution:** Usually means Stripe returned wrong data - check Stripe dashboard directly

### Issue: "currentPeriodStart is in the future"
**Cause:** Subscription starts in the future (rare but valid)
**Solution:** This is actually valid - subscription hasn't started yet

## Maintenance Checklist

- [ ] Monitor subscriptions daily (set up automated check)
- [ ] Review logs for validation warnings weekly
- [ ] Run bulk fix if > 5% of subscriptions have issues
- [ ] Keep validation rules up to date as business logic changes
- [ ] Test validation with new Stripe plan configurations
