/**
 * Command Logging Interceptor
 * Tracks all Discord command executions for audit trail and monitoring
 *
 * Usage:
 * @UseInterceptors(CommandLoggingInterceptor)
 * @SlashCommand({ name: 'trade', subcommand: 'start' })
 * async tradeStart() { ... }
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { Interaction, BaseInteraction } from 'discord.js';

/**
 * Command execution log entry
 */
export interface CommandLog {
  timestamp: number;
  userId: string;
  userName: string;
  guildId: string | null;
  commandName: string;
  commandOptions: Record<string, unknown>;
  success: boolean;
  executionTimeMs: number;
  error?: string;
  errorStack?: string;
}

/**
 * In-memory command log storage
 * Limited to 10,000 most recent entries to prevent memory growth
 */
const commandLogs: CommandLog[] = [];
const MAX_LOG_SIZE = 10000;

/**
 * Get command options from interaction
 */
function getCommandOptions(interaction: BaseInteraction): Record<string, unknown> {
  try {
    if (!('options' in interaction)) {
      return {};
    }

    const options = (interaction as any).options;
    if (!options) {
      return {};
    }

    // Extract command options
    const extracted: Record<string, unknown> = {};

    // Handle subcommand group and subcommand
    if (options.getSubcommandGroup?.(false)) {
      extracted.subcommandGroup = options.getSubcommandGroup?.(false);
    }

    if (options.getSubcommand?.(false)) {
      extracted.subcommand = options.getSubcommand?.(false);
    }

    // Get all options
    const allOptions = options._hoistedOptions || [];
    allOptions.forEach((opt: any) => {
      extracted[opt.name] = opt.value;
    });

    return extracted;
  } catch (error) {
    console.error('Error extracting command options:', error);
    return {};
  }
}

/**
 * Get command name from interaction
 */
function getCommandName(interaction: BaseInteraction): string {
  try {
    if (!('commandName' in interaction)) {
      return 'unknown';
    }

    const commandName = (interaction as any).commandName || 'unknown';
    const options = (interaction as any).options;

    if (options) {
      const subcommandGroup = options.getSubcommandGroup?.(false);
      const subcommand = options.getSubcommand?.(false);

      if (subcommandGroup && subcommand) {
        return `${commandName} ${subcommandGroup} ${subcommand}`;
      }

      if (subcommand) {
        return `${commandName} ${subcommand}`;
      }
    }

    return commandName;
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Sanitize error for logging
 */
function sanitizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'), // First 3 lines
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: String(error) };
}

/**
 * Command Logging Interceptor
 * Logs all command executions with timing and error information
 */
@Injectable()
export class CommandLoggingInterceptor implements NestInterceptor {
  private logger = new Logger(CommandLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    try {
      const args = (context.switchToRpc() as any).getArgs?.() || [];
      const interaction = args[0];

      // Skip if not a valid Discord interaction
      if (!interaction || !('user' in interaction)) {
        return next.handle();
      }

      const baseInteraction = interaction as BaseInteraction;
      const userId = baseInteraction.user?.id || 'unknown';
      const userName = baseInteraction.user?.username || 'unknown';
      const guildId = 'guildId' in baseInteraction ? baseInteraction.guildId : null;
      const commandName = getCommandName(baseInteraction);
      const commandOptions = getCommandOptions(baseInteraction);

      const startTime = Date.now();

      return next.handle().pipe(
        tap(() => {
          const executionTimeMs = Date.now() - startTime;

          const log: CommandLog = {
            timestamp: Date.now(),
            userId,
            userName,
            guildId,
            commandName,
            commandOptions,
            success: true,
            executionTimeMs,
          };

          this.storeLog(log);
          this.logger.debug(
            `✅ Command "${commandName}" executed by ${userName} (${executionTimeMs}ms)`,
          );
        }),
        catchError((error) => {
          const executionTimeMs = Date.now() - startTime;
          const { message, stack } = sanitizeError(error);

          const log: CommandLog = {
            timestamp: Date.now(),
            userId,
            userName,
            guildId,
            commandName,
            commandOptions,
            success: false,
            executionTimeMs,
            error: message,
            errorStack: stack,
          };

          this.storeLog(log);
          this.logger.error(
            `❌ Command "${commandName}" failed for ${userName}: ${message} (${executionTimeMs}ms)`,
          );

          throw error;
        }),
      );
    } catch (error) {
      // If logging fails, don't break the request
      this.logger.error('Command logging interceptor error:', error);
      return next.handle();
    }
  }

  /**
   * Store log with size limit
   */
  private storeLog(log: CommandLog): void {
    commandLogs.push(log);

    // Keep only recent logs
    if (commandLogs.length > MAX_LOG_SIZE) {
      commandLogs.splice(0, commandLogs.length - MAX_LOG_SIZE);
    }
  }
}

/**
 * Get recent command logs
 */
export function getCommandLogs(limit: number = 100, userId?: string): CommandLog[] {
  let logs = [...commandLogs];

  if (userId) {
    logs = logs.filter((log) => log.userId === userId);
  }

  return logs.reverse().slice(0, limit);
}

/**
 * Get command statistics
 */
export function getCommandStats(userId?: string) {
  let logs = commandLogs;

  if (userId) {
    logs = logs.filter((log) => log.userId === userId);
  }

  const stats = {
    totalCommands: logs.length,
    successfulCommands: 0,
    failedCommands: 0,
    averageExecutionMs: 0,
    commandCounts: new Map<string, number>(),
    errorCounts: new Map<string, number>(),
    averageExecutionByCommand: new Map<string, number>(),
  };

  let totalExecutionTime = 0;

  logs.forEach((log) => {
    if (log.success) {
      stats.successfulCommands++;
    } else {
      stats.failedCommands++;
      stats.errorCounts.set(
        log.commandName,
        (stats.errorCounts.get(log.commandName) || 0) + 1,
      );
    }

    totalExecutionTime += log.executionTimeMs;

    // Command count
    stats.commandCounts.set(
      log.commandName,
      (stats.commandCounts.get(log.commandName) || 0) + 1,
    );

    // Average execution time per command
    const existing = stats.averageExecutionByCommand.get(log.commandName) || 0;
    const count = stats.commandCounts.get(log.commandName) || 1;
    const newAverage = (existing * (count - 1) + log.executionTimeMs) / count;
    stats.averageExecutionByCommand.set(log.commandName, newAverage);
  });

  stats.averageExecutionMs =
    stats.totalCommands > 0 ? Math.round(totalExecutionTime / stats.totalCommands) : 0;

  return {
    ...stats,
    commandCounts: Object.fromEntries(stats.commandCounts),
    errorCounts: Object.fromEntries(stats.errorCounts),
    averageExecutionByCommand: Object.fromEntries(stats.averageExecutionByCommand),
  };
}

/**
 * Export logs as JSON
 */
export function exportCommandLogs(userId?: string): string {
  const logs = getCommandLogs(MAX_LOG_SIZE, userId);
  return JSON.stringify(logs, null, 2);
}

/**
 * Clear all logs (admin use)
 */
export function clearCommandLogs(userId?: string): number {
  if (userId) {
    const beforeCount = commandLogs.length;
    commandLogs.splice(
      0,
      commandLogs.length,
      ...commandLogs.filter((log) => log.userId !== userId),
    );
    return beforeCount - commandLogs.length;
  }

  const count = commandLogs.length;
  commandLogs.length = 0;
  return count;
}

/**
 * Find commands by criteria
 */
export function searchCommandLogs(criteria: Partial<CommandLog>): CommandLog[] {
  return commandLogs.filter((log) => {
    for (const [key, value] of Object.entries(criteria)) {
      if (value !== undefined && (log as any)[key] !== value) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Get commands that failed
 */
export function getFailedCommands(limit: number = 50): CommandLog[] {
  return commandLogs.filter((log) => !log.success).reverse().slice(0, limit);
}
