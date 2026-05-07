import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { ConfigService } from '@nestjs/config';
import { OperationRoutineRunStatus } from './entities/operation-routine-run.entity';
import { OperationsService } from './operations.service';
import { OpsRoutineSchedulerService } from './ops-routine-scheduler.service';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

const mockedSpawn = spawn as jest.Mock;

const createConfigService = (values: Record<string, string> = {}) =>
  ({
    get: jest.fn((key: string) => values[key]),
  }) as unknown as ConfigService;

const createOperationsService = () =>
  ({
    recordRoutineRun: jest.fn().mockResolvedValue({ id: 1 }),
  }) as unknown as jest.Mocked<Pick<OperationsService, 'recordRoutineRun'>>;

const mockSpawnSuccess = () => {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  mockedSpawn.mockReturnValue(child);
  setImmediate(() => {
    child.stdout.emit('data', '{"status":"PLANNED"}');
    child.emit('close', 0);
  });
};

describe('OpsRoutineSchedulerService', () => {
  beforeEach(() => {
    mockedSpawn.mockReset();
  });

  it('keeps scheduled execution disabled by default', async () => {
    const service = new OpsRoutineSchedulerService(
      createConfigService(),
      createOperationsService() as unknown as OperationsService,
    );

    await expect(service.dispatchScheduledRoutines()).resolves.toEqual([]);
    expect(mockedSpawn).not.toHaveBeenCalled();
  });

  it('runs a manual dry-run and journals every requested routine', async () => {
    mockSpawnSuccess();
    const operationsService = createOperationsService();
    const service = new OpsRoutineSchedulerService(
      createConfigService({ OPS_ROUTINE_SCHEDULER_MODE: 'disabled' }),
      operationsService as unknown as OperationsService,
    );

    const result = await service.runManual(
      'tenant-a',
      { routines: ['daily', 'slo'], mode: 'dry-run', date: '2026-05-08' },
      77,
    );

    expect(result.status).toBe('PASSED');
    expect(mockedSpawn).toHaveBeenCalledWith(
      process.execPath,
      expect.arrayContaining([
        'scripts/ops-routine-scheduler.mjs',
        '--dry-run',
        '--routines',
        'daily,slo',
      ]),
      expect.objectContaining({ shell: false }),
    );
    expect(operationsService.recordRoutineRun).toHaveBeenCalledTimes(2);
    expect(operationsService.recordRoutineRun).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({
        routine: 'daily',
        status: OperationRoutineRunStatus.PASSED,
        startedAt: expect.any(String),
        finishedAt: expect.any(String),
        metadata: expect.objectContaining({
          trigger: 'manual',
          mode: 'dry-run',
          actorId: 77,
          exitCode: 0,
        }),
      }),
    );
  });

  it('records disabled manual attempts as skipped without spawning', async () => {
    const operationsService = createOperationsService();
    const service = new OpsRoutineSchedulerService(
      createConfigService(),
      operationsService as unknown as OperationsService,
    );

    const result = await service.runManual(
      'tenant-a',
      { routines: ['backup'], mode: 'disabled' },
      77,
    );

    expect(result.status).toBe('DISABLED');
    expect(mockedSpawn).not.toHaveBeenCalled();
    expect(operationsService.recordRoutineRun).toHaveBeenCalledWith(
      'tenant-a',
      expect.objectContaining({
        routine: 'backup',
        status: OperationRoutineRunStatus.SKIPPED,
      }),
    );
  });
});
