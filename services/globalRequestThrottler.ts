/**
 * GLOBAL REQUEST THROTTLER
 * Manages concurrent API requests across the entire application
 * Prevents API overload by limiting request rate and implementing circuit breaker
 */

class GlobalRequestThrottler {
    private static instance: GlobalRequestThrottler;
    private activeRequests = 0;
    private maxConcurrentRequests = 3; // Start conservative
    private requestQueue: Array<{
        fn: () => Promise<any>;
        priority: 'critical' | 'high' | 'normal' | 'low';
        createdAt: number;
        resolve: (v: any) => void;
        reject: (e: any) => void;
    }> = [];
    
    private recentErrors: { timestamp: number; type: string }[] = [];
    private errorThresholdWindow = 60000; // 60 seconds
    private circuitBreakerOpen = false;
    private circuitBreakerOpenUntil = 0;
    
    // Track errors per operation type
    private errorRateByType = new Map<string, { count: number; window: number[] }>();
    
    private static readonly PRIORITY_DELAYS = {
        critical: 0,      // Chapter generation
        high: 500,        // Planning, research
        normal: 2000,     // Secondary operations
        low: 5000,        // Non-essential (marketing, etc.)
    };

    static getInstance(): GlobalRequestThrottler {
        if (!GlobalRequestThrottler.instance) {
            GlobalRequestThrottler.instance = new GlobalRequestThrottler();
        }
        return GlobalRequestThrottler.instance;
    }

    async enqueue<T>(
        fn: () => Promise<T>,
        operationType: string = 'unknown',
        priority: 'critical' | 'high' | 'normal' | 'low' = 'normal'
    ): Promise<T> {
        return new Promise((resolve, reject) => {
            this.requestQueue.push({
                fn,
                priority,
                createdAt: Date.now(),
                resolve,
                reject,
            });
            this.processQueue(operationType);
        });
    }

    private async processQueue(operationType: string) {
        if (this.activeRequests >= this.maxConcurrentRequests) {
            return; // Queue is full
        }

        if (this.requestQueue.length === 0) {
            return; // Nothing to process
        }

        // Check circuit breaker
        if (this.circuitBreakerOpen) {
            if (Date.now() < this.circuitBreakerOpenUntil) {
                // Still open - wait before retrying
                setTimeout(() => this.processQueue(operationType), 1000);
                return;
            } else {
                // Close the breaker
                this.circuitBreakerOpen = false;
                console.log('✅ Circuit breaker closed - resuming requests');
            }
        }

        // Sort by priority (critical first, then by age)
        this.requestQueue.sort((a, b) => {
            const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            return a.createdAt - b.createdAt;
        });

        const request = this.requestQueue.shift()!;
        const delay = GlobalRequestThrottler.PRIORITY_DELAYS[request.priority];

        // Add adaptive delay based on error rate
        const errorRate = this.getErrorRate();
        const adaptiveDelay = Math.ceil(delay * (1 + errorRate / 50)); // Scale up to 3x under high errors

        await new Promise(r => setTimeout(r, adaptiveDelay));

        this.activeRequests++;
        try {
            const result = await request.fn();
            // Success: reduce error tracking
            this.recentErrors = this.recentErrors.filter(e => Date.now() - e.timestamp < this.errorThresholdWindow);
            request.resolve(result);
        } catch (error: any) {
            // Error: track it
            this.recentErrors.push({
                timestamp: Date.now(),
                type: operationType,
            });

            // Check if we should open circuit breaker
            const recentErrorCount = this.recentErrors.filter(e => Date.now() - e.timestamp < this.errorThresholdWindow).length;
            if (recentErrorCount > 5) {
                this.openCircuitBreaker();
            }

            request.reject(error);
        } finally {
            this.activeRequests--;
            // Process next request
            this.processQueue(operationType);
        }
    }

    private openCircuitBreaker() {
        if (this.circuitBreakerOpen) return;
        this.circuitBreakerOpen = true;
        this.circuitBreakerOpenUntil = Date.now() + 30000; // 30 second timeout
        console.warn('🔴 CIRCUIT BREAKER OPENED - Pausing requests for 30 seconds');
        
        // Reject all queued low-priority requests
        const newQueue: typeof this.requestQueue = [];
        for (const req of this.requestQueue) {
            if (req.priority === 'low') {
                req.reject(new Error('Circuit breaker open - request cancelled'));
            } else {
                newQueue.push(req);
            }
        }
        this.requestQueue = newQueue;
    }

    private getErrorRate(): number {
        const recentCount = this.recentErrors.filter(
            e => Date.now() - e.timestamp < this.errorThresholdWindow
        ).length;
        return Math.min(50, recentCount); // Cap at 50%
    }

    // Public diagnostics
    getStatus() {
        return {
            activeRequests: this.activeRequests,
            maxConcurrentRequests: this.maxConcurrentRequests,
            queueLength: this.requestQueue.length,
            circuitBreakerOpen: this.circuitBreakerOpen,
            recentErrorCount: this.recentErrors.filter(e => Date.now() - e.timestamp < this.errorThresholdWindow).length,
            errorRate: this.getErrorRate(),
        };
    }

    // Dynamically adjust max concurrent requests
    setMaxConcurrentRequests(max: number) {
        this.maxConcurrentRequests = Math.max(1, Math.min(5, max));
    }

    // Reset for testing
    reset() {
        this.activeRequests = 0;
        this.requestQueue = [];
        this.recentErrors = [];
        this.circuitBreakerOpen = false;
        this.errorRateByType.clear();
    }
}

export default GlobalRequestThrottler;
