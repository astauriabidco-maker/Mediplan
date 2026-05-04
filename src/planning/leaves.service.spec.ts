import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { Agent } from '../agents/entities/agent.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { Leave, LeaveStatus, LeaveType } from './entities/leave.entity';
import { LeaveBalance } from './entities/leave-balance.entity';
import { LeavesService } from './leaves.service';

const createRepositoryMock = () => ({
  create: jest.fn((data) => data),
  save: jest.fn(async (data) => ({ id: data.id ?? 1, ...data })),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  createQueryBuilder: jest.fn(),
});

const createQueryBuilderMock = (count: number) => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  getCount: jest.fn(async () => count),
});

describe('LeavesService', () => {
  let service: LeavesService;
  let leavesRepository: ReturnType<typeof createRepositoryMock>;
  let leaveBalanceRepository: ReturnType<typeof createRepositoryMock>;
  let agentRepository: ReturnType<typeof createRepositoryMock>;
  let auditService: { log: jest.Mock };
  let notificationsService: { notifyLeaveRequested: jest.Mock; notifyLeaveProcessed: jest.Mock };

  beforeEach(async () => {
    leavesRepository = createRepositoryMock();
    leaveBalanceRepository = createRepositoryMock();
    agentRepository = createRepositoryMock();
    auditService = { log: jest.fn(async () => ({})) };
    notificationsService = {
      notifyLeaveRequested: jest.fn(async () => undefined),
      notifyLeaveProcessed: jest.fn(async () => undefined),
    };

    leavesRepository.createQueryBuilder.mockReturnValue(createQueryBuilderMock(0));
    agentRepository.findOne.mockResolvedValue({
      id: 10,
      tenantId: 'tenant-a',
      nom: 'Agent Ten',
      managerId: 20,
      manager: { id: 20 },
    });
    agentRepository.findOneBy.mockResolvedValue({ id: 20, tenantId: 'tenant-a', nom: 'Manager' });
    leaveBalanceRepository.findOne.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeavesService,
        { provide: getRepositoryToken(Leave), useValue: leavesRepository },
        { provide: getRepositoryToken(LeaveBalance), useValue: leaveBalanceRepository },
        { provide: getRepositoryToken(Agent), useValue: agentRepository },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<LeavesService>(LeavesService);
  });

  const start = new Date('2026-02-10T00:00:00.000Z');
  const end = new Date('2026-02-12T00:00:00.000Z');

  it('rejects invalid date ranges', async () => {
    await expect(service.requestLeave(
      'tenant-a',
      10,
      new Date('2026-02-12T00:00:00.000Z'),
      new Date('2026-02-10T00:00:00.000Z'),
      LeaveType.CONGE_ANNUEL,
      'Repos',
      10,
    )).rejects.toBeInstanceOf(BadRequestException);

    expect(leavesRepository.save).not.toHaveBeenCalled();
  });

  it('rejects overlapping pending or approved leaves', async () => {
    leavesRepository.createQueryBuilder.mockReturnValue(createQueryBuilderMock(1));

    await expect(service.requestLeave(
      'tenant-a',
      10,
      start,
      end,
      LeaveType.CONGE_ANNUEL,
      'Repos',
      10,
    )).rejects.toBeInstanceOf(BadRequestException);

    expect(leavesRepository.save).not.toHaveBeenCalled();
  });

  it('allows a direct manager to request leave for a managed agent', async () => {
    const leave = await service.requestLeave(
      'tenant-a',
      10,
      start,
      end,
      LeaveType.CONGE_ANNUEL,
      'Repos',
      { id: 20 },
    );

    expect(leave.status).toBe(LeaveStatus.PENDING);
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      20,
      AuditAction.CREATE,
      AuditEntityType.LEAVE,
      1,
      expect.objectContaining({ action: 'REQUEST_LEAVE', agentId: 10, requestedBy: 20 }),
    );
  });

  it('allows admin or HR actors to request leave for any tenant agent', async () => {
    agentRepository.findOne.mockResolvedValue({
      id: 10,
      tenantId: 'tenant-a',
      nom: 'Agent Ten',
      manager: { id: 20 },
    });

    await service.requestLeave(
      'tenant-a',
      10,
      start,
      end,
      LeaveType.CONGE_ANNUEL,
      'Repos',
      { id: 99, canManageAll: true },
    );

    expect(leavesRepository.save).toHaveBeenCalled();
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      99,
      AuditAction.CREATE,
      AuditEntityType.LEAVE,
      1,
      expect.objectContaining({ requestedBy: 99 }),
    );
  });

  it('rejects non-manager actors requesting leave for another agent', async () => {
    await expect(service.requestLeave(
      'tenant-a',
      10,
      start,
      end,
      LeaveType.CONGE_ANNUEL,
      'Repos',
      { id: 77 },
    )).rejects.toBeInstanceOf(BadRequestException);

    expect(leavesRepository.save).not.toHaveBeenCalled();
  });

  it('approves only pending leave requests and debits inclusive leave days', async () => {
    leavesRepository.findOne.mockResolvedValue({
      id: 5,
      tenantId: 'tenant-a',
      start,
      end,
      type: LeaveType.CONGE_ANNUEL,
      status: LeaveStatus.PENDING,
      agent: { id: 10, manager: { id: 20 } },
    });
    leaveBalanceRepository.create.mockImplementation((data) => data);

    const leave = await service.validateLeave('tenant-a', 20, 5, LeaveStatus.APPROVED);

    expect(leave.status).toBe(LeaveStatus.APPROVED);
    expect(leaveBalanceRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      consumed: 3,
    }));
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      20,
      AuditAction.VALIDATE,
      AuditEntityType.LEAVE,
      5,
      expect.objectContaining({ previousStatus: LeaveStatus.PENDING, status: LeaveStatus.APPROVED }),
    );
  });

  it('rejects validation of already processed leave requests', async () => {
    leavesRepository.findOne.mockResolvedValue({
      id: 5,
      tenantId: 'tenant-a',
      status: LeaveStatus.APPROVED,
      agent: { id: 10, manager: { id: 20 } },
    });

    await expect(service.validateLeave('tenant-a', 20, 5, LeaveStatus.APPROVED))
      .rejects.toBeInstanceOf(BadRequestException);
  });
});
