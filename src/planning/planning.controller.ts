import { Controller, Get, Post, Body, Query, UseGuards, Request, ParseIntPipe, Patch, Param, BadRequestException } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { OptimizationService } from './optimization.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutoSchedulerService, ShiftNeed } from './auto-scheduler.service';
import { DocumentsService } from '../documents/documents.service';
import { Shift } from './entities/shift.entity';
import { Leave, LeaveType, LeaveStatus } from './entities/leave.entity';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';

@Controller('planning')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanningController {
    constructor(
        private readonly planningService: PlanningService,
        private readonly optimizationService: OptimizationService,
        private readonly autoSchedulerService: AutoSchedulerService,
        @InjectRepository(Agent)
        private readonly agentRepository: Repository<Agent>,
        @InjectRepository(Leave)
        private readonly leaveRepository: Repository<Leave>,
        @InjectRepository(Shift)
        private readonly shiftRepository: Repository<Shift>,
        private readonly documentsService: DocumentsService,
    ) { }

    @UseGuards(JwtAuthGuard)
    @Post('leaves')
    @Permissions('leaves:request')
    async createLeave(@Request() req: any, @Body() body: { agentId: number; start: string; end: string; type: LeaveType; reason?: string }) {
        const leave = this.leaveRepository.create({
            agent: { id: body.agentId },
            start: new Date(body.start),
            end: new Date(body.end),
            type: body.type || LeaveType.CONGE_ANNUEL,
            reason: body.reason,
            status: LeaveStatus.APPROVED, // Auto-approve for MVP
            tenantId: req.user.tenantId
        });
        return this.leaveRepository.save(leave);
    }

    @UseGuards(JwtAuthGuard)
    @Get('replacements')
    @Permissions('planning:read')
    async getReplacements(
        @Request() req: any,
        @Query('start') start: string,
        @Query('end') end: string,
        @Query('competency') competency: string // Optional filter
    ) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const tenantId = (req.user.role === 'SUPER_ADMIN' && req.query.tenantId) 
            ? req.query.tenantId 
            : req.user.tenantId;

        // 1. Get all agents
        const agents = await this.agentRepository.find({
            where: { tenantId },
            relations: ['agentCompetencies', 'agentCompetencies.competency']
        });

        const availableAgents = [];

        for (const agent of agents) {
            // Check Match Competency/Role (simplified reused logic)
            if (competency) {
                const target = competency.toLowerCase();
                // Check skills
                const skills = agent.agentCompetencies?.map(ac => ac.competency.name.toLowerCase()) || [];
                const hasSkill = skills.some(s => s.includes(target));
                // Check job
                const job = (agent.jobTitle || '').toLowerCase();
                const matchesJob = job.includes(target);

                if (!hasSkill && !matchesJob) continue;
            }

            // Check Availability (using public method if refactored, or duplicating logic for now as checkAvailability is private)
            // Ideally AutoSchedulerService should expose isAvailable. 
            // For now, let's just check shifts and leaves here or assumption:
            // Let's make checkAvailability public in AutoScheduler? No, let's keep it simple here.

            // QUICK IMPLEMENTATION: Check directly here
            const hasShift = await this.planningService.getWeeklyHours(tenantId, agent.id, startDate) > 45; // Rough check on hours? No, check overlap.
            // Accessing repository via Service would be better.
            // Let's rely on autoScheduler logic if exposed?
            // Since I can't easily change private mod in one go without viewing, I'll duplicate the checks simply using injected Repos in Controller?
            // I don't have ShiftRepo injected in Controller. 
            // I will assume for now checking 'planningService.validateShift' might be useful but it checks limits, not overlaps.

            // ... actually, let's just use AutoSchedulerService if I can make checkAvailability public?
            // Or better, let's add a method 'findReplacements' in AutoSchedulerService.
        }

        // REFACTOR: Moving logic to service is cleaner.
        return this.autoSchedulerService.findReplacements(tenantId, startDate, endDate, competency);
    }

    @UseGuards(JwtAuthGuard)
    @Get('leaves')
    @Permissions('planning:read')
    async getLeaves(@Request() req: any, @Query('tenantId') queryTenantId?: string) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.leaveRepository.find({
            where: { tenantId },
            relations: ['agent']
        });
    }

    @Get('shifts')
    @Permissions('planning:read')
    async getShifts(
        @Request() req: any,
        @Query('start') start: string,
        @Query('end') end: string,
        @Query('facilityId') facilityId?: string,
        @Query('serviceId') serviceId?: string,
        @Query('tenantId') queryTenantId?: string
    ) {
        const tenantId = (req.user.role === 'SUPER_ADMIN' && queryTenantId) 
            ? queryTenantId 
            : req.user.tenantId;
        return this.planningService.getShifts(
            tenantId,
            new Date(start),
            new Date(end),
            facilityId ? parseInt(facilityId, 10) : undefined,
            serviceId ? parseInt(serviceId, 10) : undefined
        );
    }

    @UseGuards(JwtAuthGuard)
    @Get('validate')
    @Permissions('planning:read')
    async validate(
        @Request() req: any,
        @Query('agentId', ParseIntPipe) agentId: number,
        @Query('start') start: string,
        @Query('end') end: string
    ) {
        const isValid = await this.planningService.validateShift(
            req.user.tenantId, // Pass tenantId from JWT
            agentId,
            new Date(start),
            new Date(end)
        );
        return { isValid };
    }

    @UseGuards(JwtAuthGuard)
    @Post('optimize')
    @Permissions('planning:manage')
    async optimize(@Request() req: any, @Body('shifts') shifts: { id: string; start: string; end: string; requiredSkill: string }[]) {
        // Fetch agents belonging to the tenant
        const agents = await this.agentRepository.find({
            where: { tenantId: req.user.tenantId },
            relations: ['agentCompetencies', 'agentCompetencies.competency']
        });

        const parsedShifts = shifts.map(s => ({
            ...s,
            start: new Date(s.start),
            end: new Date(s.end),
        }));

        // Pass tenantId to optimization service
        return this.optimizationService.compute(parsedShifts, agents, req.user.tenantId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('auto-schedule')
    @Permissions('planning:manage')
    async autoSchedule(
        @Request() req: any,
        @Body() body: { start: string; end: string; needs: ShiftNeed[] }
    ) {
        const tenantId = req.user.tenantId;
        return this.autoSchedulerService.generateSchedule(
            tenantId,
            new Date(body.start),
            new Date(body.end),
            body.needs.map(n => ({
                ...n,
                start: new Date(n.start),
                end: new Date(n.end)
            }))
        );
    }

    // TÂCHE 3 : Endpoint API qui déclenche la génération Intelligente de l'IA (Basée sur l'Arbre H24)
    @UseGuards(JwtAuthGuard)
    @Post('generate')
    @Permissions('planning:manage')
    async generate(
        @Request() req: any,
        @Body() body: { start: string; end: string }
    ) {
        const tenantId = req.user.tenantId;
        const startDate = new Date(body.start);
        const endDate = new Date(body.end);

        // Appel direct au moteur intelligent (Deduction via HospitalServices)
        return this.autoSchedulerService.generateSmartSchedule(tenantId, startDate, endDate);
    }

    @Get('shift-applications')
    @Permissions('planning:read')
    async getShiftApplications(@Request() req: any) {
        return this.planningService.getShiftApplications(req.user.tenantId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('shift-applications/:id/approve')
    @Permissions('planning:write')
    async approveGhtApplication(@Request() req: any, @Param('id') id: string) {
        return this.planningService.approveGhtApplication(req.user.tenantId, id, req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('shift-applications/:id/reject')
    @Permissions('planning:write')
    async rejectGhtApplication(@Request() req: any, @Param('id') id: string) {
        return this.planningService.rejectGhtApplication(req.user.tenantId, id, req.user.id);
    }

    @UseGuards(JwtAuthGuard)
    @Post('assign-replacement')
    @Permissions('planning:write')
    async assignReplacement(
        @Request() req: any,
        @Body() data: { agentId: number; start: string; end: string; postId: string }
    ) {
        return this.planningService.assignReplacement(
            req.user.tenantId,
            data.agentId,
            new Date(data.start),
            new Date(data.end),
            data.postId
        );
    }

    @Patch('shifts/:id')
    @Permissions('planning:write')
    async updateShift(
        @Request() req: any,
        @Param('id') id: string,
        @Body() data: { start: string; end: string }
    ) {
        try {
            return await this.planningService.updateShift(
                req.user.tenantId,
                id,
                new Date(data.start),
                new Date(data.end),
                req.user.id
            );
        } catch (error) {
            throw new BadRequestException(error.message);
        }
    }

    @UseGuards(JwtAuthGuard)
    @Post('shifts/:id/generate-contract')
    @Permissions('documents:write')
    async generateContract(@Request() req: any, @Param('id') id: string) {
        const shift = await this.shiftRepository.findOne({ 
            where: { id: parseInt(id, 10), tenantId: req.user.tenantId },
            relations: ['agent', 'hospitalService'] 
        });

        if (!shift) {
            throw new BadRequestException('Shift not found');
        }

        if (!shift.agent) {
            throw new BadRequestException('Cannot generate contract for an unassigned shift');
        }

        return this.documentsService.generateContractForShift(req.user.tenantId, shift, shift.agent);
    }
}
