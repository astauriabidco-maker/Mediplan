import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, UserRole } from './agents/entities/agent.entity';
import { Shift } from './planning/entities/shift.entity';
import { Competency } from './competencies/entities/competency.entity';
import { AgentCompetency } from './competencies/entities/agent-competency.entity';
import * as bcrypt from 'bcrypt';
import { addDays, startOfWeek, setHours, setMinutes } from 'date-fns';

@Injectable()
export class SeedService {
    constructor(
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        @InjectRepository(Shift)
        private shiftRepository: Repository<Shift>,
        @InjectRepository(Competency)
        private competencyRepository: Repository<Competency>,
        @InjectRepository(AgentCompetency)
        private agentCompRepository: Repository<AgentCompetency>,
    ) { }

    async seed() {
        // --- 1. Clean existing data ---
        try {
            // Disable Foreign Key checks or use Cascade
            await this.agentRepository.query('TRUNCATE TABLE agent, shift, agent_competency, contract RESTART IDENTITY CASCADE');
        } catch (e) {
            console.log('Error clearing tables', e);
        }

        // --- 2. Create Agents ---
        const hashedPassword = await bcrypt.hash('password123', 10);

        const agentsData = [
            {
                nom: 'Admin Mediplan',
                email: 'admin@mediplan.com',
                matricule: 'PLATFORM-001',
                telephone: '+33600000000',
                password: hashedPassword,
                tenantId: 'PLATFORM',
                role: UserRole.SUPER_ADMIN,
            },
            {
                nom: 'Jean Dupont',
                email: 'jean.dupont@mediplan.com',
                matricule: 'FR-001',
                telephone: '+33612345678',
                password: hashedPassword,
                tenantId: 'DEFAULT_TENANT',
            },
            {
                nom: "Samuel Eto'o",
                email: 'samuel.etoo@mediplan.com',
                matricule: 'CM-009',
                telephone: '+237612345678',
                password: hashedPassword,
                tenantId: 'DEFAULT_TENANT',
            },
            {
                nom: 'Marie Curie',
                email: 'marie.curie@mediplan.com',
                matricule: 'FR-002',
                telephone: '+33687654321',
                password: hashedPassword,
                tenantId: 'DEFAULT_TENANT',
            },
        ];

        const savedAgents = [];
        for (const agentData of agentsData) {
            const agent = this.agentRepository.create(agentData);
            savedAgents.push(await this.agentRepository.save(agent));
        }

        const [admin, jean, samuel, marie] = savedAgents;

        // --- 2.5 Create Competencies ---
        const comp1 = await this.competencyRepository.save({ name: 'AFGSU Niveau 2', category: 'Urgences' });
        const comp2 = await this.competencyRepository.save({ name: 'Manipulation Respirateur', category: 'Réanimation' });
        const comp3 = await this.competencyRepository.save({ name: 'Gestion Incendie', category: 'Sécurité' });

        // Assign some competencies to Jean mapping to real life bounds
        const today = new Date();
        const futureDate = new Date();
        futureDate.setFullYear(today.getFullYear() + 2); // Valid
        const pastDate = new Date();
        pastDate.setMonth(today.getMonth() - 2); // Expired
        const soonDate = new Date();
        soonDate.setDate(today.getDate() + 15); // Expiring soon (<30 days)

        await this.agentCompRepository.save([
            { agent: jean, competency: comp1, level: 3, expirationDate: futureDate },
            { agent: jean, competency: comp2, level: 5, expirationDate: pastDate },
            { agent: samuel, competency: comp1, level: 2, expirationDate: soonDate },
            { agent: marie, competency: comp3, level: 4, expirationDate: futureDate }
        ]);

        // --- 3. Create Shifts ---
        const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday start

        const shift由于 = [];

        // Shifts for Samuel (VALIDATED)
        for (let i = 0; i < 5; i++) {
            const day = addDays(startOfCurrentWeek, i);
            shift由于.push(
                this.shiftRepository.create({
                    start: setHours(setMinutes(day, 0), 8), // 08:00
                    end: setHours(setMinutes(day, 0), 16), // 16:00
                    postId: 'MEDECIN_GARDE',
                    status: 'VALIDATED',
                    agent: samuel,
                    tenantId: 'DEFAULT_TENANT',
                })
            );
        }

        // Shifts for Jean (PENDING)
        for (let i = 0; i < 5; i++) {
            const day = addDays(startOfCurrentWeek, i);
            // Different hours to mix things up
            shift由于.push(
                this.shiftRepository.create({
                    start: setHours(setMinutes(day, 0), 14), // 14:00
                    end: setHours(setMinutes(day, 0), 22), // 22:00
                    postId: 'INFIRMIER_NUIT',
                    status: 'PENDING',
                    agent: jean,
                    tenantId: 'DEFAULT_TENANT',
                })
            );
        }

        await this.shiftRepository.save(shift由于);

        return { message: 'Database seeded successfully', agents: savedAgents.length, shifts: shift由于.length };
    }
}
