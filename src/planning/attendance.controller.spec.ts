import { PERMISSIONS_KEY } from '../auth/permissions.decorator';
import { UserStatus } from '../agents/entities/agent.entity';
import { AttendanceController } from './attendance.controller';

const createRequest = (overrides: Partial<any> = {}) => ({
  user: {
    id: 42,
    tenantId: 'tenant-a',
    role: 'ADMIN',
    permissions: ['planning:read'],
    ...overrides,
  },
});

const createRepositoryMock = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
});

describe('AttendanceController', () => {
  let controller: AttendanceController;
  let attendanceRepository: ReturnType<typeof createRepositoryMock>;
  let agentRepository: ReturnType<typeof createRepositoryMock>;
  let shiftRepository: ReturnType<typeof createRepositoryMock>;
  let settingsService: { getSetting: jest.Mock };

  beforeEach(() => {
    attendanceRepository = createRepositoryMock();
    agentRepository = createRepositoryMock();
    shiftRepository = createRepositoryMock();
    settingsService = { getSetting: jest.fn().mockResolvedValue(15) };

    agentRepository.find.mockResolvedValue([]);
    shiftRepository.find.mockResolvedValue([]);
    attendanceRepository.find.mockResolvedValue([]);

    controller = new AttendanceController(
      attendanceRepository as any,
      agentRepository as any,
      shiftRepository as any,
      settingsService as any,
    );
  });

  it('requires planning:read on daily status', () => {
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        AttendanceController.prototype.getDailyStatus,
      ),
    ).toEqual(['planning:read']);
  });

  it('ignores tenantId query parameters for non-super-admin users', async () => {
    await controller.getDailyStatus(
      createRequest(),
      'tenant-b',
      '2026-01-12T00:00:00.000Z',
    );

    expect(settingsService.getSetting).toHaveBeenCalledWith(
      'tenant-a',
      null,
      'ATTENDANCE_LATE_MARGIN_MINUTES',
    );
    expect(agentRepository.find).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-a', status: UserStatus.ACTIVE },
      relations: ['hospitalService'],
    });
  });

  it('allows SUPER_ADMIN users to explicitly inspect another tenant', async () => {
    await controller.getDailyStatus(
      createRequest({ role: 'SUPER_ADMIN' }),
      'tenant-b',
      '2026-01-12T00:00:00.000Z',
    );

    expect(agentRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-b', status: UserStatus.ACTIVE },
      }),
    );
  });
});
