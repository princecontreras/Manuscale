/**
 * Intelligent Response Cache Service
 * Caches AI responses to reduce token usage on repeated operations
 * Implements TTL-based expiration and memory-aware eviction
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  hits: number;
}

class CacheService {
  private static instance: CacheService;
  private cache = new Map<string, CacheEntry<any>>();
  
  // TTL configurations by operation type (in seconds)
  private readonly TTL_CONFIGS = {
    outline: 900,              // 15 minutes - outlines are stable for a blueprint
    metadata: 3600,            // 1 hour - metadata (keywords, categories) rarely changes
    bibliography: 7200,        // 2 hours - bibliography is research-based, fairly stable
    imagePrompt: 7200,         // 2 hours - image prompts based on blueprint
    authority: 600,            // 10 minutes - project memory/authority bible
    dedication: 3600,          // 1 hour - author bio/dedication relatively stable
    speech: 3600,              // 1 hour - TTS output stable for same text
    chapterContext: 300,       // 5 minutes - chapter facts are more dynamic
    marketing: 600,            // 10 minutes - marketing assets more dynamic
  };

  private readonly MAX_CACHE_SIZE = 100;
  private readonly MAX_MEMORY_MB = 50;

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Generate deterministic cache key from input parameters
   */
  private generateKey(operation: string, params: any): string {
    // Create a stable hash of the parameters
    const paramsStr = JSON.stringify(params);
    const hash = this.simpleHash(paramsStr);
    return `${operation}:${hash}`;
  }

  /**
   * Simple hash function for cache keys (not cryptographic, just deterministic)
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get value from cache
   */
  get<T>(operation: string, params: any): T | null {
    const key = this.generateKey(operation, params);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    const now = Date.now();
    const age = now - entry.timestamp;
    if (age > entry.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }

    // Update hit count and return
    entry.hits++;
    return entry.data as T;
  }

  /**
   * Store value in cache
   */
  set<T>(operation: string, params: any, data: T): void {
    const key = this.generateKey(operation, params);
    const ttl = this.TTL_CONFIGS[operation as keyof typeof this.TTL_CONFIGS] || 600;

    // Check if we need to evict entries
    this.maintainCacheSize();

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      hits: 0,
    });
  }

  /**
   * Maintain cache size by evicting least-used entries
   */
  private maintainCacheSize(): void {
    // If cache is too large, evict least-used entries
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Sort by hits (ascending) and delete the least-used 20%
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].hits - b[1].hits);
      
      const toDelete = Math.ceil(entries.length * 0.2);
      for (let i = 0; i < toDelete; i++) {
        this.cache.delete(entries[i][0]);
      }
    }

    // Also check memory size (rough estimate: assume ~100KB per entry average)
    const estimatedMemoryMB = this.cache.size * 0.1;
    if (estimatedMemoryMB > this.MAX_MEMORY_MB) {
      // Aggressive eviction
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].hits - b[1].hits);
      
      while (this.cache.size > this.MAX_CACHE_SIZE / 2) {
        const toDelete = entries.shift();
        if (toDelete) this.cache.delete(toDelete[0]);
      }
    }
  }

  /**
   * Clear cache for a specific operation type
   */
  clearOperation(operation: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(operation + ':')) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear entire cache
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.entries());
    const totalHits = entries.reduce((sum, [, entry]) => sum + entry.hits, 0);
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      totalHits,
      averageHits: entries.length > 0 ? totalHits / entries.length : 0,
    };
  }
}

export default CacheService.getInstance();
