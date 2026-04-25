/**
 * Subscription date validation utilities
 * Ensures subscription dates are always valid and consistent
 */

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  correctedData?: {
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
  };
}

/**
 * Validates subscription dates from Stripe
 * 
 * Rules:
 * 1. currentPeriodStart must be a valid Date
 * 2. currentPeriodEnd must be a valid Date
 * 3. currentPeriodEnd must be AFTER currentPeriodStart (at least 1 day)
 * 4. currentPeriodEnd must be in the FUTURE (relative to now)
 * 5. The period should typically be 20-400 days (for monthly/yearly plans)
 * 
 * @param periodStart - The start of the billing period
 * @param periodEnd - The end of the billing period
 * @returns Validation result with issues found
 */
export function validateSubscriptionDates(
  periodStart: any,
  periodEnd: any
): ValidationResult {
  const issues: string[] = [];

  // Convert to Date if needed
  let start: Date;
  let end: Date;

  try {
    start = periodStart instanceof Date ? periodStart : new Date(periodStart);
    if (isNaN(start.getTime())) {
      issues.push('currentPeriodStart is not a valid date');
      return { isValid: false, issues };
    }
  } catch (e) {
    issues.push('currentPeriodStart conversion failed');
    return { isValid: false, issues };
  }

  try {
    end = periodEnd instanceof Date ? periodEnd : new Date(periodEnd);
    if (isNaN(end.getTime())) {
      issues.push('currentPeriodEnd is not a valid date');
      return { isValid: false, issues };
    }
  } catch (e) {
    issues.push('currentPeriodEnd conversion failed');
    return { isValid: false, issues };
  }

  // Rule 1: End must be after start
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (daysDiff < 1) {
    issues.push(
      `currentPeriodEnd (${end.toISOString()}) must be at least 1 day after ` +
      `currentPeriodStart (${start.toISOString()}). Difference: ${daysDiff.toFixed(1)} days`
    );
  }

  // Rule 2: End must be in the future
  const now = new Date();
  const daysUntilEnd = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilEnd < 0) {
    issues.push(
      `currentPeriodEnd (${end.toISOString()}) is in the past. ` +
      `Now: ${now.toISOString()}. Difference: ${daysUntilEnd.toFixed(1)} days`
    );
  }

  // Rule 3: Period should be reasonable (20-400 days for monthly/yearly)
  if (daysDiff < 20 || daysDiff > 400) {
    issues.push(
      `Billing period is unusual: ${daysDiff.toFixed(1)} days. ` +
      `Expected 20-400 days for monthly/yearly plans.`
    );
  }

  // Rule 4: Start should not be in the far future
  const daysFromNow = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysFromNow > 1) {
    issues.push(
      `currentPeriodStart (${start.toISOString()}) is in the future by ${daysFromNow.toFixed(1)} days. ` +
      `Usually should be today or recent past.`
    );
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
}

/**
 * Logs validation warnings with context
 * Helpful for debugging subscription date issues
 * 
 * @param context - Where the validation is happening (e.g., "checkout.session.completed")
 * @param userId - Firebase UID for tracking
 * @param subscriptionId - Stripe subscription ID
 * @param validation - The validation result
 */
export function logValidationWarnings(
  context: string,
  userId: string | null,
  subscriptionId: string,
  validation: ValidationResult
): void {
  if (!validation.isValid) {
    console.warn(`[${context}] ⚠️ SUBSCRIPTION DATE VALIDATION FAILED`, {
      firebaseUid: userId,
      subscriptionId,
      issues: validation.issues,
    });
  } else {
    console.log(`[${context}] ✓ Subscription dates valid`, {
      subscriptionId,
      issues: validation.issues.length > 0 ? validation.issues : 'none',
    });
  }
}

/**
 * Detects if subscription dates might be swapped (start/end reversed)
 * 
 * @param start - Period start date
 * @param end - Period end date
 * @returns true if dates appear to be swapped
 */
export function areSubscriptionDatesLikelySwapped(
  start: Date,
  end: Date
): boolean {
  // If start is after end, they're likely swapped
  if (start > end) {
    return true;
  }

  // If the difference is negative (which we check), they're swapped
  const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff < 1;
}

/**
 * Helper to determine which date is more likely to be correct
 * when dates appear invalid
 * 
 * @param start - Period start date
 * @param end - Period end date
 * @returns Object with suggestions
 */
export function suggestDateCorrection(
  start: Date,
  end: Date
): { swap: boolean; use: 'start' | 'end' | 'both' } {
  if (areSubscriptionDatesLikelySwapped(start, end)) {
    return {
      swap: true,
      use: 'both',
    };
  }

  const now = new Date();
  const startDaysFromNow = (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const endDaysFromNow = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  // If both are in the past, neither is reliable
  if (startDaysFromNow < 0 && endDaysFromNow < 0) {
    return { swap: false, use: 'both' };
  }

  // If end is in the past but start is not, end is wrong
  if (endDaysFromNow < 0 && startDaysFromNow >= 0) {
    return { swap: false, use: 'end' };
  }

  return { swap: false, use: 'both' };
}
