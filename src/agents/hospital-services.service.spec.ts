import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';
import { Agent } from './entities/agent.entity';
import { HospitalService } from './entities/hospital-service.entity';
import { HospitalServicesService } from './hospital-services.service';

const createRepositoryMock = () => ({
  create: jest.fn((data) => data),
  save: jest.fn(async (data) => ({ ...data, id: data.id ?? 1 })),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
});

describe('HospitalServicesService', () => {
  let service: HospitalServicesService;
  let serviceRepository: ReturnType<typeof createRepositoryMock>;
  let agentRepository: ReturnType<typeof createRepositoryMock>;
  let auditService: { log: jest.Mock };

  beforeEach(async () => {
    serviceRepository = createRepositoryMock();
    agentRepository = createRepositoryMock();
    auditService = { log: jest.fn(async () => ({})) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HospitalServicesService,
        { provide: getRepositoryToken(HospitalService), useValue: serviceRepository },
        { provide: getRepositoryToken(Agent), useValue: agentRepository },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<HospitalServicesService>(HospitalServicesService);
  });

  it('creates a service in the actor tenant and writes an audit entry', async () => {
    serviceRepository.findOne.mockResolvedValue(null);

    const result = await service.create('tenant-a', {
      name: 'Urgences',
      code: 'URG',
    }, 42);

    expect(result.id).toBe(1);
    expect(serviceRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-a',
      name: 'Urgences',
      code: 'URG',
      level: 1,
    }));
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.CREATE,
      AuditEntityType.HOSPITAL_SERVICE,
      1,
      expect.objectContaining({ name: 'Urgences', code: 'URG' }),
    );
  });

  it('rejects duplicate service codes in the same tenant', async () => {
    serviceRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 2, tenantId: 'tenant-a', code: 'URG' });

    await expect(service.create('tenant-a', {
      name: 'Urgences',
      code: 'URG',
    }, 42)).rejects.toBeInstanceOf(ConflictException);

    expect(serviceRepository.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('rejects responsible agents from another tenant', async () => {
    serviceRepository.findOne.mockResolvedValue(null);
    agentRepository.findOne.mockResolvedValue(null);

    await expect(service.create('tenant-a', {
      name: 'Cardiologie',
      chiefId: 99,
    }, 42)).rejects.toBeInstanceOf(NotFoundException);

    expect(serviceRepository.save).not.toHaveBeenCalled();
  });

  it('creates sub-services only under a parent from the same tenant', async () => {
    serviceRepository.findOne
      .mockResolvedValueOnce({ id: 10, tenantId: 'tenant-a', level: 1, name: 'Chirurgie' })
      .mockResolvedValueOnce(null);

    const result = await service.createSubService('tenant-a', 10, {
      name: 'Chirurgie Viscérale',
      code: 'CHV',
    }, 42);

    expect(result.parentServiceId).toBe(10);
    expect(result.level).toBe(2);
  });

  it('blocks service removal when assigned agents exist', async () => {
    serviceRepository.findOne.mockResolvedValue({
      id: 7,
      tenantId: 'tenant-a',
      name: 'Pédiatrie',
      agents: [{ id: 1 }],
      subServices: [],
    });

    await expect(service.remove('tenant-a', 7, 42)).rejects.toBeInstanceOf(BadRequestException);

    expect(serviceRepository.remove).not.toHaveBeenCalled();
    expect(serviceRepository.save).not.toHaveBeenCalled();
  });

  it('disables empty services instead of physically deleting them and audits the action', async () => {
    serviceRepository.findOne.mockResolvedValue({
      id: 7,
      tenantId: 'tenant-a',
      name: 'Pédiatrie',
      code: 'PED',
      isActive: true,
      agents: [],
      subServices: [],
    });

    await service.remove('tenant-a', 7, 42);

    expect(serviceRepository.remove).not.toHaveBeenCalled();
    expect(serviceRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      id: 7,
      isActive: false,
    }));
    expect(auditService.log).toHaveBeenCalledWith(
      'tenant-a',
      42,
      AuditAction.DELETE,
      AuditEntityType.HOSPITAL_SERVICE,
      7,
      expect.objectContaining({ action: 'DISABLE_HOSPITAL_SERVICE' }),
    );
  });
});
