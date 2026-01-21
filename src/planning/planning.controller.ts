import { Controller, Get, Post, Body, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { OptimizationService } from './optimization.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Agent } from '../agents/entities/agent.entity';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AutoSchedulerService, ShiftNeed } from './auto-scheduler.service';
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
        const tenantId = req.user.tenantId;

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
    async getLeaves(@Request() req: any) {
        return this.leaveRepository.find({
            where: { tenantId: req.user.tenantId },
            relations: ['agent']
        });
    }

    @UseGuards(JwtAuthGuard)
    @Get('shifts')
    @Permissions('planning:read')
    async getShifts(
        @Request() req: any,
        @Query('start') start: string,
        @Query('end') end: string
    ) {
        // Allow unauthenticated query for dev/seed verification if JwtGuard is strict?
        // But SeedService logic used 'DEFAULT_TENANT'. 
        // If accessed from frontend, we need tenantId preferably.
        // For simple verification, we might relax tenant check or use a default if user is missing (e.g. if we disable guard for debug)
        // But let's assume valid JWT for now from frontend. 
        // Wait, for 'curl' verification I don't have JWT easily. 
        // I'll make it public for now for this task, or handle missing user.
        const tenantId = req.user.tenantId;
        return this.planningService.getShifts(
            tenantId,
            new Date(start),
            new Date(end)
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

    // TÂCHE 3 : Endpoint API avec besoins fictifs
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
        const needs: ShiftNeed[] = [];

        // Générer des besoins fictifs pour chaque jour (Modèle Hôpital Standard)
        const current = new Date(startDate);
        // Ensure we iterate correctly strictly over the range
        while (current <= endDate) {

            // 1. JOUR (07h00 - 19h00)
            const dayStart = new Date(current);
            dayStart.setHours(7, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(19, 0, 0, 0);

            // Besoin: 2 Infirmiers le jour
            needs.push({
                start: dayStart,
                end: dayEnd,
                postId: 'infirmier', // Lowercase to match fuzzy logic
                count: 2
            });

            // Besoin: 1 Médecin le jour
            needs.push({
                start: dayStart,
                end: dayEnd,
                postId: 'medecin',
                count: 1
            });

            // 2. NUIT (19h00 - 07h00 le lendemain)
            const nightStart = new Date(current);
            nightStart.setHours(19, 0, 0, 0);
            const nightEnd = new Date(current);
            nightEnd.setDate(nightEnd.getDate() + 1); // Next day
            nightEnd.setHours(7, 0, 0, 0);

            // Besoin: 1 Infirmier de garde la nuit
            needs.push({
                start: nightStart,
                end: nightEnd,
                postId: 'infirmier',
                count: 1
            });

            // Besoin: 1 Médecin de garde la nuit (optionnel, disons 1 pour l'exercice)
            needs.push({
                start: nightStart,
                end: nightEnd,
                postId: 'medecin',
                count: 1
            });

            current.setDate(current.getDate() + 1);
        }

        return this.autoSchedulerService.generateSchedule(tenantId, startDate, endDate, needs);
    }

    @UseGuards(JwtAuthGuard)
    @Post('assign-replacement')
    @Permissions('planning:manage')
    async assignReplacement(@Body() body: { agentId: number; start: string; end: string; postId: string }, @Request() req: any) {
        return this.planningService.assignReplacement(
            req.user.tenantId,
            body.agentId,
            new Date(body.start),
            new Date(body.end),
            body.postId
        );
    }
}
