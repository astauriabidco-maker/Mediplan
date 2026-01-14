import { Controller, Get, Param, ParseIntPipe, Request, UseGuards, Post, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompetenciesService } from './competencies.service';

@Controller('competencies')
@UseGuards(JwtAuthGuard)
export class CompetenciesController {
    constructor(private readonly competenciesService: CompetenciesService) { }

    @Get('agent/:agentId')
    getValidByAgent(@Param('agentId', ParseIntPipe) agentId: number) {
        return this.competenciesService.findValidByAgent(agentId);
    }

    @Get('matrix')
    async findAllMatrix(@Request() req: any) {
        const tenantId = req.user.tenantId; // Ensure tenant isolation
        return this.competenciesService.findAllMatrix(tenantId);
    }

    @Get('seed-test-data')
    async seed() {
        return this.competenciesService.seedTestData();
    }

    @Post()
    async create(@Body() body: { name: string, category: string }) {
        return this.competenciesService.create(body.name, body.category);
    }

    @Post('agent')
    async assignToAgent(@Body() body: { agentId: number, competencyId: number, level: number, expirationDate?: string }) {
        const expirationDate = body.expirationDate ? new Date(body.expirationDate) : undefined;
        return this.competenciesService.assignToAgent(body.agentId, body.competencyId, body.level, expirationDate);
    }
}

