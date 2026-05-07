import { spawn } from 'child_process';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
  OPS_ROUTINE_IDS,
  OpsRoutineId,
  OpsRoutineMode,
  RunOpsRoutineSchedulerDto,
} from './dto/ops-routine-scheduler.dto';
import { OperationRoutineRunStatus } from './entities/operation-routine-run.entity';
import { OperationsService } from './operations.service';

interface OpsRoutineSchedulerConfig {
  mode: OpsRoutineMode;
  reportDir: string;
  journalPath?: string;
  baseUrl: string;
  frequenciesMinutes: Record<OpsRoutineId, number>;
}

export interface OpsRoutineSchedulerResult {
  trigger: 'manual' | 'scheduled';
  status: 'DISABLED' | 'PASSED' | 'FAILED';
  mode: OpsRoutineMode;
  routines: OpsRoutineId[];
  tenantId: string;
  actorId?: number;
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  stdoutTail?: string;
  stderrTail?: string;
}

const DEFAULT_FREQUENCIES_MINUTES: Record<OpsRoutineId, number> = {
  daily: 1440,
  weekly: 10080,
  escalation: 15,
  backup: 1440,
  audit: 1440,
  slo: 60,
};

@Injectable()
export class OpsRoutineSchedulerService {
  private readonly logger = new Logger(OpsRoutineSchedulerService.name);
  private readonly config: OpsRoutineSchedulerConfig;
  private readonly nextDueAt = new Map<OpsRoutineId, number>();
  private running = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly operationsService: OperationsService,
  ) {
    this.config = this.loadConfig();
    const now = Date.now();
    for (const routine of OPS_ROUTINE_IDS) {
      this.nextDueAt.set(
        routine,
        now + this.config.frequenciesMinutes[routine] * 60_000,
      );
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchScheduledRoutines(): Promise<OpsRoutineSchedulerResult[]> {
    if (this.config.mode === 'disabled') {
      return [];
    }
    if (this.running) {
      this.logger.warn(
        JSON.stringify({
          event: 'opsRoutineScheduler.skipped',
          reason: 'busy',
        }),
      );
      return [];
    }

    const now = Date.now();
    const dueRoutines = OPS_ROUTINE_IDS.filter(
      (routine) =>
        now >= (this.nextDueAt.get(routine) || Number.MAX_SAFE_INTEGER),
    );

    if (!dueRoutines.length) {
      return [];
    }

    this.running = true;
    try {
      const results: OpsRoutineSchedulerResult[] = [];
      for (const routine of dueRoutines) {
        results.push(
          await this.runScheduler({
            trigger: 'scheduled',
            tenantId:
              this.configService.get<string>('TENANT_ID') || 'HGD-DOUALA',
            routines: [routine],
            mode: this.config.mode,
          }),
        );
        this.nextDueAt.set(
          routine,
          Date.now() + this.config.frequenciesMinutes[routine] * 60_000,
        );
      }
      return results;
    } finally {
      this.running = false;
    }
  }

  runManual(
    tenantId: string,
    dto: RunOpsRoutineSchedulerDto,
    actorId?: number,
  ): Promise<OpsRoutineSchedulerResult> {
    const mode =
      dto.mode ||
      (this.config.mode === 'disabled' ? 'dry-run' : this.config.mode);
    return this.runScheduler({
      trigger: 'manual',
      tenantId,
      actorId,
      routines: dto.routines?.length ? dto.routines : [...OPS_ROUTINE_IDS],
      mode,
      reportDir: dto.reportDir,
      journalPath: dto.journalPath,
      baseUrl: dto.baseUrl,
      incidentId: dto.incidentId,
      date: dto.date,
    });
  }

  private async runScheduler(options: {
    trigger: 'manual' | 'scheduled';
    tenantId: string;
    actorId?: number;
    routines: OpsRoutineId[];
    mode: OpsRoutineMode;
    reportDir?: string;
    journalPath?: string;
    baseUrl?: string;
    incidentId?: string;
    date?: string;
  }): Promise<OpsRoutineSchedulerResult> {
    const startedAt = new Date().toISOString();
    if (options.mode === 'disabled') {
      const result: OpsRoutineSchedulerResult = {
        trigger: options.trigger,
        status: 'DISABLED',
        mode: options.mode,
        routines: options.routines,
        tenantId: options.tenantId,
        actorId: options.actorId,
        startedAt,
        finishedAt: new Date().toISOString(),
        exitCode: null,
      };
      this.logAttempt(result);
      await this.recordRoutineAttempts(result);
      return result;
    }

    const args = this.buildArgs(options);

    return await new Promise((resolve) => {
      const child = spawn(process.execPath, args, {
        cwd: process.cwd(),
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          TENANT_ID: options.tenantId,
          BASE_URL: options.baseUrl || this.config.baseUrl,
        },
      });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
      child.on('close', async (code) => {
        const result: OpsRoutineSchedulerResult = {
          trigger: options.trigger,
          status: code === 0 ? 'PASSED' : 'FAILED',
          mode: options.mode,
          routines: options.routines,
          tenantId: options.tenantId,
          actorId: options.actorId,
          startedAt,
          finishedAt: new Date().toISOString(),
          exitCode: code,
          stdoutTail: stdout.slice(-4000),
          stderrTail: stderr.slice(-4000),
        };
        this.logAttempt(result);
        await this.recordRoutineAttempts(result);
        resolve(result);
      });
    });
  }

  private buildArgs(options: {
    routines: OpsRoutineId[];
    mode: OpsRoutineMode;
    reportDir?: string;
    journalPath?: string;
    baseUrl?: string;
    incidentId?: string;
    date?: string;
  }): string[] {
    const args = [
      'scripts/ops-routine-scheduler.mjs',
      `--${options.mode}`,
      '--routines',
      options.routines.join(','),
      '--format',
      'json',
      '--report-dir',
      options.reportDir || this.config.reportDir,
      '--base-url',
      options.baseUrl || this.config.baseUrl,
    ];

    if (options.journalPath || this.config.journalPath) {
      args.push(
        '--journal',
        options.journalPath || this.config.journalPath || '',
      );
    }
    if (options.incidentId) {
      args.push('--incident-id', options.incidentId);
    }
    if (options.date) {
      args.push('--date', options.date);
    }

    for (const routine of OPS_ROUTINE_IDS) {
      args.push(
        `--${routine}-frequency`,
        `PT${this.config.frequenciesMinutes[routine]}M`,
      );
    }

    return args;
  }

  private loadConfig(): OpsRoutineSchedulerConfig {
    return {
      mode: this.readMode(),
      reportDir:
        this.configService.get<string>('OPS_ROUTINE_REPORT_DIR') ||
        'prod-reports',
      journalPath: this.configService.get<string>('OPS_ROUTINE_JOURNAL'),
      baseUrl:
        this.configService.get<string>('BASE_URL')?.replace(/\/$/, '') ||
        'http://localhost:3005',
      frequenciesMinutes: Object.fromEntries(
        OPS_ROUTINE_IDS.map((routine) => [
          routine,
          this.readFrequencyMinutes(routine),
        ]),
      ) as Record<OpsRoutineId, number>,
    };
  }

  private readMode(): OpsRoutineMode {
    const raw =
      this.configService.get<string>('OPS_ROUTINE_SCHEDULER_MODE') ||
      'disabled';
    return ['disabled', 'dry-run', 'mock', 'api'].includes(raw)
      ? (raw as OpsRoutineMode)
      : 'disabled';
  }

  private readFrequencyMinutes(routine: OpsRoutineId): number {
    const key = `OPS_ROUTINE_${routine.toUpperCase()}_EVERY_MINUTES`;
    const raw = this.configService.get<string>(key);
    const parsed = Number.parseInt(raw || '', 10);
    return Number.isFinite(parsed) && parsed > 0
      ? parsed
      : DEFAULT_FREQUENCIES_MINUTES[routine];
  }

  private logAttempt(result: OpsRoutineSchedulerResult) {
    this.logger.log(
      JSON.stringify({
        event: 'opsRoutineScheduler.attempt',
        trigger: result.trigger,
        status: result.status,
        mode: result.mode,
        routines: result.routines,
        tenantId: result.tenantId,
        actorId: result.actorId,
        startedAt: result.startedAt,
        finishedAt: result.finishedAt,
        exitCode: result.exitCode,
      }),
    );
  }

  private async recordRoutineAttempts(result: OpsRoutineSchedulerResult) {
    await Promise.all(
      result.routines.map(async (routine) => {
        try {
          await this.operationsService.recordRoutineRun(result.tenantId, {
            routine,
            status: this.toRoutineRunStatus(result.status),
            startedAt: result.startedAt,
            finishedAt: result.finishedAt,
            error: result.status === 'FAILED' ? result.stderrTail : undefined,
            metadata: {
              trigger: result.trigger,
              mode: result.mode,
              actorId: result.actorId,
              exitCode: result.exitCode,
            },
          });
        } catch (error) {
          this.logger.error(
            JSON.stringify({
              event: 'opsRoutineScheduler.journalFailed',
              routine,
              tenantId: result.tenantId,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      }),
    );
  }

  private toRoutineRunStatus(status: OpsRoutineSchedulerResult['status']) {
    if (status === 'PASSED') return OperationRoutineRunStatus.PASSED;
    if (status === 'FAILED') return OperationRoutineRunStatus.FAILED;
    return OperationRoutineRunStatus.SKIPPED;
  }
}
