import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { Agent, UserStatus } from './entities/agent.entity';
import { HealthRecord } from './entities/health-record.entity';
import { HospitalService } from './entities/hospital-service.entity';
import { AgentsService } from './agents.service';

const createRepositoryMock = () => ({
  create: jest.fn((data) => data),
  save: jest.fn(async (data) => ({ ...data, id: data.id ?? 1 })),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
});

describe('AgentsService', () => {
  let service: AgentsService;
  let agentRepository: ReturnType<typeof createRepositoryMock>;
  let hospitalServiceRepository: ReturnType<typeof createRepositoryMock>;
  let auditService: { log: jest.Mock };

  beforeEach(async () => {
    agentRepository = createRepositoryMock();
    hospitalServiceRepository = createRepositoryMock();
    auditService = { log: jest.fn(async () => ({})) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: getRepositoryToken(Agent), useValue: agentRepository },
        { provide: getRepositoryToken(HealthRecord), useValue: createRepositoryMock() },
        { provide: getRepositoryToken(HospitalService), useValue: hospitalServiceRepository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  it('creates an agent inside the actor tenant and writes an audit entry', async () => {
    agentRepository.findOne.mockResolvedValue(null);
    hospitalServiceRepository.findOne.mockResolvedValue({ id: 10, tenantId: 'tenant-a' });

    const result = await service.create({
      tenantId: 'tenant-a',
      nom: 'Nurse One',
      email: 'nurse.one@example.test',
      matricule: 'MAT-001',
      telephone: '+33123456789',
      hospitalServiceId: 10,
    }, 42);

    expect(result.id).toBe(1);
    expect(agentRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      email: 'nurse.one@example.test',
      hospitalServiceId: 10,
      password: expect.any(String),
    }));
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.CREATE,
      AuditEntityType.AGENT,
      '1',
      expect.objectContaining({ email: 'nurse.one@example.test', matricule: 'MAT-001' }),
    );
  });

  it('rejects duplicate emails in the same tenant before creating an agent', async () => {
    agentRepository.findOne.mockResolvedValueOnce({ id: 99, tenantId: 'tenant-a', email: 'duplicate@example.test' });

    await expect(service.create({
      tenantId: 'tenant-a',
      nom: 'Duplicate',
      email: 'duplicate@example.test',
      matricule: 'MAT-002',
      telephone: '+33123456789',
    }, 42)).rejects.toBeInstanceOf(ConflictException);

    expect(agentRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('rejects managers from another tenant', async () => {
    agentRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await expect(service.create({
      tenantId: 'tenant-a',
      nom: 'Managed',
      email: 'managed@example.test',
      matricule: 'MAT-003',
      telephone: '+33123456789',
      managerId: 77,
    }, 42)).rejects.toBeInstanceOf(NotFoundException);

    expect(agentRepository.save).not.toHaveBeenCalled();
  });

  it('disables agents instead of physically deleting them and audits the action', async () => {
    agentRepository.findOne.mockResolvedValue({
      id: 5,
      tenantId: 'tenant-a',
      email: 'agent@example.test',
      matricule: 'MAT-005',
      nom: 'Agent Five',
      status: UserStatus.ACTIVE,
    });

    const result = await service.remove(5, 'tenant-a', 42);

    expect(agentRepository.remove).not.toHaveBeenCalled();
    expect(agentRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 5,
      status: UserStatus.DISABLED,
    }));
    expect(result.status).toBe(UserStatus.DISABLED);
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.DELETE,
      AuditEntityType.AGENT,
      '5',
      expect.objectContaining({ action: 'DISABLE_AGENT' }),
    );
  });
});
