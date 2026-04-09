import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { AgentCompetency } from './entities/agent-competency.entity';
import { Agent } from '../agents/entities/agent.entity';
import { Competency } from './entities/competency.entity';
import { Shift } from '../planning/entities/shift.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CompetenciesService {
    constructor(
        @InjectRepository(AgentCompetency)
        private agentCompetencyRepository: Repository<AgentCompetency>,
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        @InjectRepository(Competency)
        private competencyRepository: Repository<Competency>,
        @InjectRepository(Shift)
        private shiftRepository: Repository<Shift>,
    ) { }

    async findAllMatrix(tenantId: string) {
        const agents = await this.agentRepository.find({
            where: { tenantId },
            relations: ['agentCompetencies', 'agentCompetencies.competency', 'hospitalService'],
            order: { nom: 'ASC' },
        });

        // We also need all available competencies to build columns
        const competencies = await this.competencyRepository.find({
            order: { name: 'ASC' },
        });

        return { agents, competencies };
    }


    async findValidByAgent(agentId: number): Promise<AgentCompetency[]> {
        return this.agentCompetencyRepository.find({
            where: {
                agent: { id: agentId },
                expirationDate: MoreThan(new Date()),
            },
            relations: ['competency'],
        });
    }

    async create(name: string, category: string): Promise<Competency> {
        return this.competencyRepository.save({ name, category });
    }

    async assignToAgent(agentId: number, competencyId: number, level: number, expirationDate?: Date): Promise<AgentCompetency> {
        let agentComp = await this.agentCompetencyRepository.findOne({
            where: {
                agent: { id: agentId },
                competency: { id: competencyId }
            }
        });

        if (agentComp) {
            agentComp.level = level;
            if (expirationDate) agentComp.expirationDate = expirationDate;
        } else {
            agentComp = this.agentCompetencyRepository.create({
                agent: { id: agentId },
                competency: { id: competencyId },
                level,
                expirationDate
            });
        }

        return this.agentCompetencyRepository.save(agentComp);
    }

    async seedTestData() {
        const hashedPassword = await bcrypt.hash('password123', 10);

        // 1. Create Agent
        const agent = await this.agentRepository.save({
            nom: 'Test Agent',
            email: `test-${Date.now()}@mediplan.com`,
            matricule: `MAT-${Date.now()}`,
            telephone: '+33123456789',
            password: hashedPassword,
            tenantId: 'DEFAULT_TENANT'
        });

        // 2. Create Competencies
        const skill1 = await this.competencyRepository.save({ name: 'JavaScript', category: 'Tech' });

        // 3. Link with Agent
        const now = new Date();
        const future = new Date();
        future.setFullYear(now.getFullYear() + 1);

        await this.agentCompetencyRepository.save([
            { agent, competency: skill1, level: 3, expirationDate: future },
        ]);

        // 4. Create Shifts (existing 30h this week)
        const startOfWeek = new Date();
        startOfWeek.setHours(8, 0, 0, 0); // Monday 8am
        startOfWeek.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));

        const shifts = [];
        for (let i = 0; i < 3; i++) { // 3 shifts of 10h = 30h
            const s = new Date(startOfWeek);
            s.setDate(startOfWeek.getDate() + i);
            const e = new Date(s);
            e.setHours(18, 0, 0, 0); // 10h duration
            shifts.push({ agent, start: s, end: e, postId: 'POST-A', tenantId: 'DEFAULT_TENANT' });
        }
        await this.shiftRepository.save(shifts);

        return {
            message: 'Test data seeded!',
            agentId: agent.id,
            agentEmail: agent.email, // Return email for login UI
            info: 'Created agent with 30h of shifts this week (1 valid competency).',
        };
    }
}
