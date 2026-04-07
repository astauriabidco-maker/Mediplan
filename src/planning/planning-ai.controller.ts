import { Controller, Get, Post, Param, UseGuards, Request, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Permissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AutoSchedulerService } from './auto-scheduler.service';
import { InjectRepository } from '@nestjs/typeorm';
import { ShiftProposal, ProposalStatus } from './entities/shift-proposal.entity';
import { Repository } from 'typeorm';
import { Shift } from './entities/shift.entity';

@Controller('planning/ai')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanningAiController {
    constructor(
        private readonly autoSchedulerService: AutoSchedulerService,
        @InjectRepository(ShiftProposal)
        private readonly proposalRepository: Repository<ShiftProposal>,
        @InjectRepository(Shift)
        private readonly shiftRepository: Repository<Shift>,
    ) { }

    @Get('problems')
    @Permissions('planning:read')
    async getProblems(@Request() req: any) {
        return this.autoSchedulerService.scanForProblems(req.user.tenantId);
    }

    @Get('proposals')
    @Permissions('planning:read')
    async getProposals(@Request() req: any) {
        return this.proposalRepository.find({
            where: { tenantId: req.user.tenantId, status: ProposalStatus.PENDING },
            relations: ['shift', 'originalAgent', 'suggestedAgent']
        });
    }

    @Post('proposals/:id/apply')
    @Permissions('planning:write')
    async applyProposal(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
        const proposal = await this.proposalRepository.findOne({
            where: { id, tenantId: req.user.tenantId, status: ProposalStatus.PENDING },
            relations: ['shift']
        });

        if (!proposal) {
            throw new BadRequestException('Proposition non trouvée ou déjà traitée.');
        }

        // Apply change to Shift
        const shift = proposal.shift;
        shift.agent = { id: proposal.suggestedAgentId } as any;
        shift.status = 'VALIDATED'; // Mark as resolved/validated
        await this.shiftRepository.save(shift);

        // Update Proposal Status
        proposal.status = ProposalStatus.ACCEPTED;
        await this.proposalRepository.save(proposal);

        return { success: true, shiftId: shift.id };
    }

    @Post('proposals/:id/reject')
    @Permissions('planning:write')
    async rejectProposal(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
        const proposal = await this.proposalRepository.findOne({
            where: { id, tenantId: req.user.tenantId, status: ProposalStatus.PENDING }
        });

        if (!proposal) {
            throw new BadRequestException('Proposition non trouvée.');
        }

        proposal.status = ProposalStatus.REJECTED;
        await this.proposalRepository.save(proposal);

        return { success: true };
    }
}
