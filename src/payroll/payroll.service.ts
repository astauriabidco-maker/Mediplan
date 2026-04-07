import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payslip, PayslipStatus } from './entities/payslip.entity';
import { PayrollVariable } from './entities/payroll-variable.entity';
import { PlanningService } from '../planning/planning.service';
import { AgentsService } from '../agents/agents.service';
import { ShiftType } from '../planning/entities/shift.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';

@Injectable()
export class PayrollService {
    constructor(
        @InjectRepository(Payslip)
        private payslipRepository: Repository<Payslip>,
        @InjectRepository(PayrollVariable)
        private payrollVariableRepository: Repository<PayrollVariable>,
        private planningService: PlanningService,
        private agentsService: AgentsService,
        private auditService: AuditService,
    ) { }

    async generatePayslip(tenantId: string, agentId: number, month: number, year: number): Promise<Payslip> {
        // 1. Get Agent details
        const actorIdSystem = -1; // System execution
        const agent = await this.agentsService.findOne(agentId, tenantId, actorIdSystem);
        if (!agent) throw new NotFoundException('Agent not found');

        // Delete existing draft payslip to avoid duplicates
        await this.payslipRepository.delete({ agent: { id: agentId }, month, year, tenantId });

        // 2. Fetch shifts for the month
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);
        const shifts = await this.planningService.getShifts(tenantId, startOfMonth, endOfMonth);
        const agentShifts = shifts.filter(s => s.agent?.id === agent.id);

        // 3. Collect Payroll Variables
        const variables = await this.payrollVariableRepository.find({ where: { tenantId } });
        const getValue = (code: string, fallback: number) => variables.find(v => v.code === code)?.value ?? fallback;

        const valPoint = getValue('VALEUR_POINT', 4.92);
        const primeNuitHour = getValue('PRIME_NUIT_HEURE', 1.07); // 1.07 euros per night hour
        const primeGarde = getValue('FORFAIT_GARDE', 250); // 250 euros forfait

        // 4. Calculate Base Salary
        const indexValue = agent.index ? parseInt(agent.index, 10) : 350; // default minimum index if not set
        const baseSalary = indexValue * valPoint;

        // NEW: Load Prime Dimanche
        const primeDimancheHour = getValue('PRIME_DIMANCHE_HEURE', 5.00); // 5.00 euros per sunday hour

        // 5. Calculate Exact Allowances from Shifts
        let allowances = 0;
        let nightHours = 0;
        let sundayHours = 0;
        let gardesCount = 0;

        for (const shift of agentShifts) {
            if (shift.type === ShiftType.GARDE) {
                gardesCount++;
                allowances += primeGarde;
            }

            // Iterate hour by hour to precisely calculate Night and Sunday hours
            let current = new Date(shift.start);
            while (current < shift.end) {
                const day = current.getDay();
                const hour = current.getHours();

                // 21:00 to 05:59 is night (6 is day)
                const isNight = hour >= 21 || hour < 6;
                // Sunday is 0
                const isSunday = day === 0;

                // Step is 1 hour maximum, but handle fractional end hour if needed (simplified to 1h chunks here)
                // A better approach for exact minute precision:
                const nextHour = new Date(current);
                nextHour.setHours(current.getHours() + 1, 0, 0, 0);
                if (nextHour > shift.end) nextHour.setTime(shift.end.getTime());

                const durationMs = nextHour.getTime() - current.getTime();
                const durationHours = durationMs / (1000 * 3600);

                if (isNight) {
                    nightHours += durationHours;
                    allowances += durationHours * primeNuitHour;
                }

                if (isSunday) {
                    sundayHours += durationHours;
                    allowances += durationHours * primeDimancheHour;
                }

                // Move current pointer
                current = nextHour;
            }
        }

        // Round to 2 decimals
        nightHours = Math.round(nightHours * 100) / 100;
        sundayHours = Math.round(sundayHours * 100) / 100;
        allowances = Math.round(allowances * 100) / 100;

        // 6. Create Payslip Snapshot
        const payslip = this.payslipRepository.create({
            agent,
            month,
            year,
            baseSalary,
            allowances,
            status: PayslipStatus.DRAFT,
            tenantId,
            details: {
                index: indexValue,
                valPoint,
                gardesCount,
                nightHours,
                sundayHours,
                primeGarde,
                primeNuitHour,
                primeDimancheHour,
                shiftsProcessed: agentShifts.length
            }
        });

        await this.payslipRepository.save(payslip);

        await this.auditService.log(
            tenantId,
            actorIdSystem,
            AuditAction.AUTO_GENERATE,
            AuditEntityType.PAYROLL,
            agentId.toString(),
            { month, year, amount: payslip.baseSalary + payslip.allowances }
        );

        return payslip;
    }

    async getPayslips(tenantId: string, month: number, year: number): Promise<Payslip[]> {
        return this.payslipRepository.find({
            where: { tenantId, month, year },
            relations: ['agent'],
            order: { agent: { nom: 'ASC' } }
        });
    }

    async generateAllPayslips(tenantId: string, month: number, year: number): Promise<{ generated: number }> {
        const agents = await this.agentsService.findAll(tenantId);
        
        let generated = 0;
        for (const agent of agents) {
            try {
                // we reuse the single generator, it will delete existing drafts automatically
                await this.generatePayslip(tenantId, agent.id, month, year);
                generated++;
            } catch (error) {
                // ignore
            }
        }
        
        return { generated };
    }
}
