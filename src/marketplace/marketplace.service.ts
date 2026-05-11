import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, MoreThan } from 'typeorm';
import { Shift } from '../planning/entities/shift.entity';
import { ShiftApplication, ShiftApplicationStatus } from '../planning/entities/shift-application.entity';
import { ComplianceValidationService } from '../planning/compliance-validation.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class MarketplaceService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(ShiftApplication)
    private shiftApplicationRepository: Repository<ShiftApplication>,
    private complianceService: ComplianceValidationService,
    private eventsGateway: EventsGateway,
  ) {}

  async getMyApplications(tenantId: string, agentId: number) {
    return this.shiftApplicationRepository.find({
      where: { agent: { id: agentId }, tenantId },
      relations: ['shift', 'shift.facility'],
      order: { appliedAt: 'DESC' }
    });
  }

  async getAvailableShifts(tenantId: string) {
    const now = new Date();
    return this.shiftRepository.find({
      where: [
        { agent: IsNull(), status: 'PLANNED', start: MoreThan(now), tenantId },
        { agent: IsNull(), status: 'BROADCASTED_LOCAL', start: MoreThan(now), tenantId },
        { agent: IsNull(), status: 'BROADCASTED_GHT', start: MoreThan(now), tenantId },
      ],
      relations: ['facility'],
      order: {
        start: 'ASC',
      },
    });
  }

  async getShiftDetails(tenantId: string, agentId: number, shiftId: number) {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId, tenantId },
      relations: ['facility'],
    });

    if (!shift) {
      throw new NotFoundException('Garde non trouvée');
    }

    const applicantCount = await this.shiftApplicationRepository.count({
      where: { shift: { id: shiftId } },
    });

    const compliance = await this.complianceService.validateShift(
      tenantId,
      agentId,
      shift.start,
      shift.end
    );

    let score = 85;
    if (!compliance.isValid) {
      score = 0;
    }

    const existingApp = await this.shiftApplicationRepository.findOne({
      where: { shift: { id: shiftId }, agent: { id: agentId } },
    });

    return {
      shift,
      applicantCount,
      compliance,
      score,
      hasApplied: !!existingApp,
      applicationStatus: existingApp?.status
    };
  }

  async applyToShift(tenantId: string, agentId: number, shiftId: number) {
    const shift = await this.shiftRepository.findOne({
      where: { id: shiftId, tenantId },
    });

    if (!shift) {
      throw new NotFoundException('Garde non trouvée');
    }

    const existingApp = await this.shiftApplicationRepository.findOne({
      where: { shift: { id: shiftId }, agent: { id: agentId } },
    });

    if (existingApp) {
      throw new BadRequestException('Vous avez déjà postulé à cette garde');
    }

    const compliance = await this.complianceService.validateShift(
      tenantId,
      agentId,
      shift.start,
      shift.end
    );

    if (!compliance.isValid) {
      throw new BadRequestException('Règles de conformité non respectées, candidature impossible.');
    }

    const app = this.shiftApplicationRepository.create({
      shift: { id: shiftId },
      agent: { id: agentId },
      status: ShiftApplicationStatus.PENDING,
      score: 85,
      tenantId,
    });

    await this.shiftApplicationRepository.save(app);
    this.eventsGateway.broadcastMarketplaceUpdate();

    return app;
  }

  async getPendingApplications(tenantId: string) {
    return this.shiftApplicationRepository.find({
      where: { 
        tenantId,
        status: ShiftApplicationStatus.PENDING 
      },
      relations: ['shift', 'shift.facility', 'agent'],
      order: { score: 'DESC', appliedAt: 'ASC' }
    });
  }

  async approveApplication(tenantId: string, applicationId: number, action: 'APPROVE' | 'REJECT') {
    const application = await this.shiftApplicationRepository.findOne({
      where: { id: applicationId, tenantId },
      relations: ['shift', 'agent'],
    });

    if (!application) {
      throw new NotFoundException('Candidature non trouvée');
    }

    if (action === 'REJECT') {
      application.status = ShiftApplicationStatus.REJECTED;
      await this.shiftApplicationRepository.save(application);
      this.eventsGateway.broadcastMarketplaceUpdate();
      return application;
    }

    // Sinon APPROVE
    application.status = ShiftApplicationStatus.ACCEPTED;
    
    // Mettre à jour la garde (Affecter l'agent)
    const shift = application.shift;
    shift.agent = application.agent;
    shift.status = 'PLANNED'; // ou 'PUBLISHED'
    
    // Sauvegarder la garde
    await this.shiftRepository.save(shift);
    
    // Sauvegarder l'application approuvée
    await this.shiftApplicationRepository.save(application);

    // Rejeter toutes les autres candidatures en attente pour cette même garde
    await this.shiftApplicationRepository.update(
      { shift: { id: shift.id }, status: ShiftApplicationStatus.PENDING, id: MoreThan(0) },
      { status: ShiftApplicationStatus.REJECTED }
    );

    // Emettre les événements
    this.eventsGateway.broadcastMarketplaceUpdate();
    this.eventsGateway.broadcastPlanningUpdate();
    
    return application;
  }

  async getAnalytics(tenantId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const totalApplications = await this.shiftApplicationRepository.count({
      where: { tenantId, appliedAt: MoreThan(startOfMonth) }
    });

    const acceptedApplications = await this.shiftApplicationRepository.count({
      where: { tenantId, status: ShiftApplicationStatus.ACCEPTED, appliedAt: MoreThan(startOfMonth) }
    });

    const fillRate = totalApplications > 0 ? (acceptedApplications / totalApplications) * 100 : 0;

    // Simulation de l'économie réalisée (remplacement interne vs intérim)
    const avoidedCost = acceptedApplications * 450;

    // Top candidats
    const apps = await this.shiftApplicationRepository.find({
      where: { tenantId, status: ShiftApplicationStatus.ACCEPTED },
      relations: ['agent']
    });

    const candidateScores: Record<string, number> = {};
    apps.forEach(app => {
      if (app.agent) {
        const name = `${app.agent.firstName} ${app.agent.lastName}`;
        candidateScores[name] = (candidateScores[name] || 0) + 1;
      }
    });

    const topCandidates = Object.entries(candidateScores)
      .map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Mock des tendances pour les graphes
    const trendData = [];
    for(let i=6; i>=0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      trendData.push({
        date: d.toISOString().slice(5,10),
        candidatures: Math.floor(Math.random() * 8) + 2,
        pourvues: Math.floor(Math.random() * 4) + 1
      });
    }

    return {
      fillRate: fillRate.toFixed(1),
      totalApplications,
      acceptedApplications,
      avoidedCost,
      topCandidates,
      trendData
    };
  }
}
