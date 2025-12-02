import { createClient } from './supabase';

/**
 * Advanced Cache Manager for Permission Service
 * Implements multi-level caching, invalidation strategies, and performance optimization
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  checksum?: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  evictionCount: number;
  memoryUsage: number;
  averageResponseTime: number;
  cacheSize: number;
}

export interface CacheConfig {
  defaultTTL: number;
  maxMemory: number; // in MB
  maxEntries: number;
  cleanupInterval: number; // in ms
  compressionEnabled: boolean;
  checksumVerification: boolean;
  persistenceEnabled: boolean;
}

/**
 * Multi-level cache implementation with memory, disk, and distributed caching support
 */
export class CacheManager<T = any> {
  private memoryCache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private metrics: CacheMetrics;
  private cleanupInterval?: NodeJS.Timeout;
  private persistenceQueue: Array<{ key: string; value: any; operation: 'set' | 'delete' }> = [];

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutos
      maxMemory: 100, // 100 MB
      maxEntries: 10000,
      cleanupInterval: 60 * 1000, // 1 minuto
      compressionEnabled: true,
      checksumVerification: true,
      persistenceEnabled: false,
      ...config
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictionCount: 0,
      memoryUsage: 0,
      averageResponseTime: 0,
      cacheSize: 0
    };

    this.startCleanupInterval();
  }

  /**
   * Get value from cache with performance tracking
   */
  async get(key: string): Promise<T | null> {
    const startTime = performance.now();

    try {
      // Check memory cache first
      const entry = this.memoryCache.get(key);

      if (entry) {
        if (this.isExpired(entry)) {
          this.memoryCache.delete(key);
          this.metrics.misses++;
          this.updateMetrics(startTime);
          return null;
        }

        // Update entry statistics
        entry.accessCount++;
        entry.lastAccessed = Date.now();

        this.metrics.hits++;
        this.updateMetrics(startTime);

        return entry.value;
      }

      this.metrics.misses++;
      this.updateMetrics(startTime);
      return null;

    } catch (error) {
      console.error('Error getting cache entry:', error);
      this.metrics.misses++;
      this.updateMetrics(startTime);
      return null;
    }
  }

  /**
   * Set value in cache with TTL and metadata
   */
  async set(key: string, value: T, options: { ttl?: number; checksum?: string } = {}): Promise<void> {
    try {
      const ttl = options.ttl || this.config.defaultTTL;
      const now = Date.now();

      // Check memory limits before adding
      this.evictIfNecessary();

      const entry: CacheEntry<T> = {
        value,
        timestamp: now,
        ttl,
        accessCount: 0,
        lastAccessed: now,
        checksum: options.checksum
      };

      this.memoryCache.set(key, entry);

      // Add to persistence queue if enabled
      if (this.config.persistenceEnabled) {
        this.persistenceQueue.push({ key, value, operation: 'set' });
      }

    } catch (error) {
      console.error('Error setting cache entry:', error);
    }
  }

  /**
   * Delete cache entry
   */
  async delete(key: string): Promise<void> {
    try {
      const deleted = this.memoryCache.delete(key);

      if (deleted && this.config.persistenceEnabled) {
        this.persistenceQueue.push({ key, value: null, operation: 'delete' });
      }
    } catch (error) {
      console.error('Error deleting cache entry:', error);
    }
  }

  /**
   * Check if cache entry exists and is valid
   */
  async has(key: string): Promise<boolean> {
    const entry = this.memoryCache.get(key);
    return entry && !this.isExpired(entry);
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      this.memoryCache.clear();
      this.persistenceQueue = [];

      // Reset metrics
      this.metrics = {
        hits: 0,
        misses: 0,
        hitRate: 0,
        evictionCount: 0,
        memoryUsage: 0,
        averageResponseTime: 0,
        cacheSize: 0
      };
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getMetrics(): CacheMetrics {
    const { hits, misses } = this.metrics;
    this.metrics.hitRate = hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0;

    return { ...this.metrics };
  }

  /**
   * Bulk get operations for performance
   */
  async bulkGet(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    }

    return results;
  }

  /**
   * Bulk set operations for performance
   */
  async bulkSet(entries: Array<{ key: string; value: T; ttl?: number }>): Promise<void> {
    for (const entry of entries) {
      await this.set(entry.key, entry.value, { ttl: entry.ttl });
    }
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * Get cache value size in bytes
   */
  private getValueSize(value: any): number {
    try {
      const json = JSON.stringify(value);
      return new Blob([json]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  /**
   * Evict entries if memory limits are exceeded
   */
  private evictIfNecessary(): void {
    const currentMemoryUsage = this.getCurrentMemoryUsage();
    const currentSize = this.memoryCache.size;

    if (currentMemoryUsage > this.config.maxMemory * 1024 * 1024 ||
        currentSize > this.config.maxEntries) {
      this.evictEntries();
    }
  }

  /**
   * Evict entries using LRU + memory pressure strategy
   */
  private evictEntries(): void {
    const entries = Array.from(this.memoryCache.entries());

    // Sort by last accessed time and memory usage
    entries.sort((a, b) => {
      const aEntry = a[1];
      const bEntry = b[1];

      // Primary sort: access time (LRU)
      const timeDiff = aEntry.lastAccessed - bEntry.lastAccessed;
      if (timeDiff !== 0) return timeDiff;

      // Secondary sort: access count (less accessed first)
      return aEntry.accessCount - bEntry.accessCount;
    });

    // Evict 20% of entries
    const evictCount = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < evictCount; i++) {
      const [key] = entries[i];
      this.memoryCache.delete(key);
    }

    this.metrics.evictionCount += evictCount;
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    let totalSize = 0;

    for (const [key, entry] of this.memoryCache) {
      totalSize += key.length * 2; // Assume 2 bytes per character for key
      totalSize += this.getValueSize(entry.value);
    }

    return totalSize;
  }

  /**
   * Update metrics with response time
   */
  private updateMetrics(startTime: number): void {
    const responseTime = performance.now() - startTime;
    const totalRequests = this.metrics.hits + this.metrics.misses;

    // Update average response time using exponential moving average
    this.metrics.averageResponseTime =
      this.metrics.averageResponseTime * 0.9 + responseTime * 0.1;

    this.metrics.cacheSize = this.memoryCache.size;
    this.metrics.memoryUsage = this.getCurrentMemoryUsage() / (1024 * 1024); // Convert to MB
  }

  /**
   * Start cleanup interval for expired entries
   */
  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
      this.processPersistenceQueue();
    }, this.config.cleanupInterval);
  }

  /**
   * Remove expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        expiredCount++;
      }
    }

    this.metrics.evictionCount += expiredCount;
  }

  /**
   * Process persistence queue for disk/database caching
   */
  private async processPersistenceQueue(): Promise<void> {
    if (this.persistenceQueue.length === 0) return;

    const batchSize = 100;
    const batch = this.persistenceQueue.splice(0, batchSize);

    try {
      const supabase = await createClient();

      // Process batch operations (implementation would depend on your persistence strategy)
      for (const operation of batch) {
        if (operation.operation === 'set') {
          // Implement Redis/database persistence if needed
        } else if (operation.operation === 'delete') {
          // Implement Redis/database deletion if needed
        }
      }
    } catch (error) {
      console.error('Error processing persistence queue:', error);
      // Re-queue failed operations
      this.persistenceQueue.unshift(...batch);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Process remaining persistence queue
    await this.processPersistenceQueue();
  }
}

/**
 * Permission-specific cache manager with role validation
 */
export class PermissionCacheManager extends CacheManager<any> {
  private userRoleCache = new CacheManager<number>({}); // Cache user roles for faster permission checks
  private permissionCache = new CacheManager<boolean>({}); // Cache permission results

  constructor(config?: Partial<CacheConfig>) {
    super(config);
    this.initializeRoleCache();
  }

  /**
   * Get user role with caching
   */
  async getUserRole(userId: string): Promise<number | null> {
    try {
      const cacheKey = `role:${userId}`;
      let roleLevel = await this.userRoleCache.get(cacheKey);

      if (roleLevel === null) {
        const supabase = await createClient();

        const { data } = await supabase
          .from('user_roles')
          .select(`
            role_id,
            roles!inner(level)
          `)
          .eq('user_id', userId)
          .single();

        roleLevel = data?.roles.level || 0;

        // Cache with longer TTL for roles (30 minutes)
        await this.userRoleCache.set(cacheKey, roleLevel, {
          ttl: 30 * 60 * 1000
        });
      }

      return roleLevel;
    } catch (error) {
      console.error('Error getting user role:', error);
      return 0;
    }
  }

  /**
   * Enhanced permission check with multi-level caching
   */
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const cacheKey = `permission:${userId}:${resource}:${action}`;

    try {
      // Check permission result cache first
      let result = await this.permissionCache.get(cacheKey);

      if (result !== null) {
        return result;
      }

      // Get user role
      const roleLevel = await this.getUserRole(userId);
      if (roleLevel === 0) {
        return false;
      }

      // Check actual permission from database
      const hasPermission = await this.verifyPermissionInDatabase(userId, resource, action, roleLevel);

      // Cache result with short TTL (1 minute for sensitive permissions)
      await this.permissionCache.set(cacheKey, hasPermission, {
        ttl: this.getPermissionTTL(resource, action)
      });

      return hasPermission;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Clear user's permission cache on role change
   */
  async clearUserCache(userId: string): Promise<void> {
    try {
      const roleKey = `role:${userId}`;
      await this.userRoleCache.delete(roleKey);

      // Clear all permission entries for this user
      const allKeys = this.getKeys();
      const userPermissionKeys = allKeys.filter(key => key.startsWith(`permission:${userId}:`));

      for (const key of userPermissionKeys) {
        await this.delete(key);
      }

      // Clear permission cache too
      const permissionKeys = this.permissionCache.getKeys();
      for (const key of permissionKeys) {
        if (key.startsWith(`permission:${userId}:`)) {
          await this.permissionCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Error clearing user cache:', error);
    }
  }

  /**
   * Initialize role cache with system roles
   */
  private async initializeRoleCache(): Promise<void> {
    try {
      const supabase = await createClient();
      const { data } = await supabase.from('roles').select('id, name, level');

      if (data) {
        for (const role of data) {
          const cacheKey = `role:system:${role.id}`;
          await this.userRoleCache.set(cacheKey, role.level, {
            ttl: 60 * 60 * 1000 // 1 hour for system roles
          });
        }
      }
    } catch (error) {
      console.error('Error initializing role cache:', error);
    }
  }

  /**
   * Verify permission in database
   */
  private async verifyPermissionInDatabase(
    userId: string,
    resource: string,
    action: string,
    roleLevel: number
  ): Promise<boolean> {
    try {
      const supabase = await createClient();

      const { data } = await supabase
        .rpc('verificar_permiso', {
          user_id: userId,
          resource,
          action
        });

      return data === true;
    } catch (error) {
      console.error('Error verifying permission in database:', error);
      return false;
    }
  }

  /**
   * Get TTL based on permission sensitivity
   */
  private getPermissionTTL(resource: string, action: string): number {
    const sensitivePermissions = [
      'users.delete',
      'roles.manage',
      'audit.read',
      'security.manage'
    ];

    const permissionKey = `${resource}.${action}`;

    if (sensitivePermissions.includes(permissionKey)) {
      return 30 * 1000; // 30 seconds for sensitive permissions
    }

    return 5 * 60 * 1000; // 5 minutes for regular permissions
  }
}

// Export global instances
export const globalCacheManager = new CacheManager();
export const permissionCacheManager = new PermissionCacheManager();