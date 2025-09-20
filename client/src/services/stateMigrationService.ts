/**
 * State Migration Service
 * Handles state migrations for version updates and compatibility
 */

export interface MigrationRule {
  id: string;
  name: string;
  description: string;
  fromVersion: string;
  toVersion: string;
  priority: number;
  required: boolean;
  transform: (state: any) => any;
  validate?: (state: any) => boolean;
  rollback?: (state: any) => any;
}

export interface MigrationResult {
  success: boolean;
  appliedMigrations: string[];
  errors: Array<{
    migrationId: string;
    error: string;
    stack?: string;
  }>;
  warnings: string[];
  finalVersion: string;
  backupCreated: boolean;
}

export interface MigrationPlan {
  fromVersion: string;
  toVersion: string;
  migrations: MigrationRule[];
  estimatedTime: number;
  riskLevel: 'low' | 'medium' | 'high';
  requiresBackup: boolean;
}

class StateMigrationService {
  private migrations: Map<string, MigrationRule> = new Map();
  private migrationHistory: Array<{
    timestamp: string;
    fromVersion: string;
    toVersion: string;
    appliedMigrations: string[];
    success: boolean;
  }> = [];

  constructor() {
    this.registerBuiltInMigrations();
  }

  /**
   * Register a migration rule
   */
  public registerMigration(migration: MigrationRule): void {
    this.migrations.set(migration.id, migration);
    console.log(`📝 [StateMigrationService] Registered migration: ${migration.id}`);
  }

  /**
   * Register multiple migrations
   */
  public registerMigrations(migrations: MigrationRule[]): void {
    migrations.forEach(migration => this.registerMigration(migration));
  }

  /**
   * Get migration plan
   */
  public getMigrationPlan(fromVersion: string, toVersion: string): MigrationPlan {
    const applicableMigrations = this.getApplicableMigrations(fromVersion, toVersion);
    
    return {
      fromVersion,
      toVersion,
      migrations: applicableMigrations,
      estimatedTime: this.estimateMigrationTime(applicableMigrations),
      riskLevel: this.assessRiskLevel(applicableMigrations),
      requiresBackup: applicableMigrations.some(m => m.required)
    };
  }

  /**
   * Execute migration plan
   */
  public async executeMigration(
    state: any, 
    fromVersion: string, 
    toVersion: string,
    options: {
      createBackup?: boolean;
      dryRun?: boolean;
      skipValidation?: boolean;
    } = {}
  ): Promise<MigrationResult> {
    const { createBackup = true, dryRun = false, skipValidation = false } = options;
    
    console.log(`🚀 [StateMigrationService] Starting migration from ${fromVersion} to ${toVersion}`);
    
    const result: MigrationResult = {
      success: false,
      appliedMigrations: [],
      errors: [],
      warnings: [],
      finalVersion: fromVersion,
      backupCreated: false
    };

    try {
      // Create backup if requested
      let backup: any = null;
      if (createBackup && !dryRun) {
        backup = this.createBackup(state);
        result.backupCreated = true;
      }

      // Get migration plan
      const plan = this.getMigrationPlan(fromVersion, toVersion);
      
      if (plan.migrations.length === 0) {
        console.log('✅ [StateMigrationService] No migrations needed');
        result.success = true;
        result.finalVersion = toVersion;
        return result;
      }

      // Sort migrations by priority and version
      const sortedMigrations = this.sortMigrations(plan.migrations);
      
      let currentState = dryRun ? JSON.parse(JSON.stringify(state)) : state;
      let currentVersion = fromVersion;

      // Apply migrations sequentially
      for (const migration of sortedMigrations) {
        try {
          console.log(`🔄 [StateMigrationService] Applying migration: ${migration.id}`);
          
          // Validate pre-conditions
          if (!skipValidation && migration.validate && !migration.validate(currentState)) {
            throw new Error(`Pre-condition validation failed for migration ${migration.id}`);
          }

          // Apply transformation
          const transformedState = migration.transform(currentState);
          
          if (!dryRun) {
            currentState = transformedState;
          }
          
          result.appliedMigrations.push(migration.id);
          currentVersion = migration.toVersion;
          
          console.log(`✅ [StateMigrationService] Applied migration: ${migration.id}`);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : undefined;
          
          result.errors.push({
            migrationId: migration.id,
            error: errorMessage,
            stack: errorStack
          });

          console.error(`❌ [StateMigrationService] Migration failed: ${migration.id}`, error);

          // If migration is required, stop execution
          if (migration.required) {
            // Attempt rollback if backup exists
            if (backup && !dryRun) {
              try {
                this.restoreBackup(state, backup);
                result.warnings.push('State restored from backup due to failed required migration');
              } catch (rollbackError) {
                result.errors.push({
                  migrationId: 'rollback',
                  error: 'Failed to restore backup after migration failure'
                });
              }
            }
            
            result.finalVersion = currentVersion;
            return result;
          } else {
            // For optional migrations, log warning and continue
            result.warnings.push(`Optional migration ${migration.id} failed: ${errorMessage}`);
          }
        }
      }

      result.success = true;
      result.finalVersion = currentVersion;

      // Record migration in history
      this.migrationHistory.push({
        timestamp: new Date().toISOString(),
        fromVersion,
        toVersion: currentVersion,
        appliedMigrations: result.appliedMigrations,
        success: result.success
      });

      console.log(`✅ [StateMigrationService] Migration completed successfully`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push({
        migrationId: 'general',
        error: errorMessage
      });
      
      console.error('❌ [StateMigrationService] Migration failed:', error);
    }

    return result;
  }

  /**
   * Get applicable migrations for version range
   */
  private getApplicableMigrations(fromVersion: string, toVersion: string): MigrationRule[] {
    const applicable: MigrationRule[] = [];
    
    for (const migration of this.migrations.values()) {
      if (this.isVersionInRange(migration.fromVersion, fromVersion, toVersion) &&
          this.compareVersions(migration.toVersion, toVersion) <= 0) {
        applicable.push(migration);
      }
    }
    
    return applicable;
  }

  /**
   * Sort migrations by priority and version dependencies
   */
  private sortMigrations(migrations: MigrationRule[]): MigrationRule[] {
    return migrations.sort((a, b) => {
      // First sort by version (earlier versions first)
      const versionCompare = this.compareVersions(a.fromVersion, b.fromVersion);
      if (versionCompare !== 0) return versionCompare;
      
      // Then by priority (higher priority first)
      return b.priority - a.priority;
    });
  }

  /**
   * Estimate migration time
   */
  private estimateMigrationTime(migrations: MigrationRule[]): number {
    // Simple estimation: 1 second per migration + complexity factor
    return migrations.length * 1000 + migrations.filter(m => m.required).length * 2000;
  }

  /**
   * Assess risk level
   */
  private assessRiskLevel(migrations: MigrationRule[]): 'low' | 'medium' | 'high' {
    const requiredCount = migrations.filter(m => m.required).length;
    const totalCount = migrations.length;
    
    if (requiredCount === 0) return 'low';
    if (requiredCount <= 2 && totalCount <= 5) return 'medium';
    return 'high';
  }

  /**
   * Create state backup
   */
  private createBackup(state: any): any {
    const backup = {
      timestamp: new Date().toISOString(),
      state: JSON.parse(JSON.stringify(state)),
      version: state.application?.version || 'unknown'
    };
    
    // Store in localStorage as well
    try {
      localStorage.setItem('state-migration-backup', JSON.stringify(backup));
    } catch (error) {
      console.warn('⚠️ [StateMigrationService] Failed to store backup in localStorage:', error);
    }
    
    return backup;
  }

  /**
   * Restore from backup
   */
  private restoreBackup(targetState: any, backup: any): void {
    Object.keys(targetState).forEach(key => delete targetState[key]);
    Object.assign(targetState, backup.state);
  }

  /**
   * Compare version strings
   */
  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    const maxLength = Math.max(v1Parts.length, v2Parts.length);
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;
      
      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }
    
    return 0;
  }

  /**
   * Check if version is in range
   */
  private isVersionInRange(version: string, fromVersion: string, toVersion: string): boolean {
    return this.compareVersions(version, fromVersion) >= 0 && 
           this.compareVersions(version, toVersion) <= 0;
  }

  /**
   * Register built-in migrations
   */
  private registerBuiltInMigrations(): void {
    // Migration from v1.0.0 to v1.1.0
    this.registerMigration({
      id: 'v1.0.0-to-v1.1.0-viewer-state',
      name: 'Viewer State Structure Update',
      description: 'Updates viewer state structure to include new UI properties',
      fromVersion: '1.0.0',
      toVersion: '1.1.0',
      priority: 100,
      required: false,
      transform: (state) => {
        if (state.viewerStates) {
          Object.values(state.viewerStates).forEach((viewerState: any) => {
            if (viewerState.ui && !viewerState.ui.panelStates) {
              viewerState.ui.panelStates = {};
            }
            if (viewerState.ui && !viewerState.ui.activeTab) {
              viewerState.ui.activeTab = 'main';
            }
          });
        }
        return state;
      },
      validate: (state) => state.viewerStates !== undefined
    });

    // Migration from v1.1.0 to v1.2.0
    this.registerMigration({
      id: 'v1.1.0-to-v1.2.0-collaboration',
      name: 'Collaboration Features Addition',
      description: 'Adds collaboration state structure',
      fromVersion: '1.1.0',
      toVersion: '1.2.0',
      priority: 90,
      required: false,
      transform: (state) => {
        if (!state.collaboration) {
          state.collaboration = {
            activeSessions: {},
            connectionStatus: 'disconnected',
            lastSync: new Date().toISOString()
          };
        }
        return state;
      }
    });

    // Migration from v1.2.0 to v1.3.0
    this.registerMigration({
      id: 'v1.2.0-to-v1.3.0-performance',
      name: 'Performance Metrics Structure',
      description: 'Updates performance metrics structure',
      fromVersion: '1.2.0',
      toVersion: '1.3.0',
      priority: 80,
      required: false,
      transform: (state) => {
        if (state.performance && !state.performance.history) {
          state.performance.history = [];
        }
        if (state.performance && !state.performance.alerts) {
          state.performance.alerts = [];
        }
        return state;
      }
    });

    // Migration for user preferences update
    this.registerMigration({
      id: 'user-preferences-shortcuts',
      name: 'User Preferences Shortcuts',
      description: 'Adds keyboard shortcuts to user preferences',
      fromVersion: '1.0.0',
      toVersion: '1.1.0',
      priority: 70,
      required: false,
      transform: (state) => {
        if (state.userPreferences && !state.userPreferences.shortcuts) {
          state.userPreferences.shortcuts = {
            'zoom-in': 'Ctrl+=',
            'zoom-out': 'Ctrl+-',
            'reset': 'Ctrl+0',
            'next-slice': 'ArrowRight',
            'prev-slice': 'ArrowLeft',
            'play-pause': 'Space'
          };
        }
        return state;
      }
    });

    // Migration for session ID addition
    this.registerMigration({
      id: 'session-id-addition',
      name: 'Session ID Addition',
      description: 'Adds session ID to viewer states',
      fromVersion: '1.0.0',
      toVersion: '1.1.0',
      priority: 60,
      required: false,
      transform: (state) => {
        if (state.viewerStates) {
          Object.values(state.viewerStates).forEach((viewerState: any) => {
            if (viewerState.session && !viewerState.session.sessionId) {
              viewerState.session.sessionId = `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            }
          });
        }
        return state;
      }
    });

    console.log('📋 [StateMigrationService] Registered built-in migrations');
  }

  /**
   * Get migration history
   */
  public getMigrationHistory(): Array<{
    timestamp: string;
    fromVersion: string;
    toVersion: string;
    appliedMigrations: string[];
    success: boolean;
  }> {
    return [...this.migrationHistory];
  }

  /**
   * Clear migration history
   */
  public clearMigrationHistory(): void {
    this.migrationHistory = [];
  }

  /**
   * Get registered migrations
   */
  public getRegisteredMigrations(): MigrationRule[] {
    return Array.from(this.migrations.values());
  }

  /**
   * Validate state structure
   */
  public validateStateStructure(state: any, expectedVersion: string): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const result = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[]
    };

    // Basic structure validation
    if (!state.application) {
      result.errors.push('Missing application section');
      result.valid = false;
    }

    if (!state.userPreferences) {
      result.errors.push('Missing userPreferences section');
      result.valid = false;
    }

    if (!state.viewerStates) {
      result.errors.push('Missing viewerStates section');
      result.valid = false;
    }

    // Version-specific validations
    if (expectedVersion && state.application?.version !== expectedVersion) {
      result.warnings.push(`Version mismatch: expected ${expectedVersion}, got ${state.application?.version}`);
    }

    return result;
  }

  /**
   * Get backup from localStorage
   */
  public getStoredBackup(): any | null {
    try {
      const backup = localStorage.getItem('state-migration-backup');
      return backup ? JSON.parse(backup) : null;
    } catch (error) {
      console.error('❌ [StateMigrationService] Failed to retrieve backup:', error);
      return null;
    }
  }

  /**
   * Clear stored backup
   */
  public clearStoredBackup(): void {
    try {
      localStorage.removeItem('state-migration-backup');
    } catch (error) {
      console.error('❌ [StateMigrationService] Failed to clear backup:', error);
    }
  }
}

// Singleton instance
let globalMigrationService: StateMigrationService | null = null;

/**
 * Get global migration service instance
 */
export function getGlobalMigrationService(): StateMigrationService {
  if (!globalMigrationService) {
    globalMigrationService = new StateMigrationService();
  }
  return globalMigrationService;
}

/**
 * Reset global migration service
 */
export function resetGlobalMigrationService(): void {
  globalMigrationService = null;
}

export { StateMigrationService };