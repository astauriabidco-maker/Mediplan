import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payslip, PayslipStatus } from './entities/payslip.entity';
import { PayrollVariable } from './entities/payroll-variable.entity';
import { PlanningService } from '../planning/planning.service';
import { AgentsService } from '../agents/agents.service';
import { ShiftType } from '../planning/entities/shift.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction, AuditEntityType } from '../audit/entities/audit-log.entity';

import { Agent } from '../agents/entities/agent.entity';
import { Contract } from '../agents/entities/contract.entity';
import { ContractBonus } from '../agents/entities/contract-bonus.entity';
import { BonusTemplate } from '../agents/entities/bonus-template.entity';
import { Attendance } from '../planning/entities/attendance.entity';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { PayrollRule, PayrollRuleType } from './entities/payroll-rule.entity';
import { PayrollAiAuditorService } from './payroll-ai-auditor.service';
import { Parser } from 'expr-eval';

@Injectable()
export class PayrollService {
    constructor(
        @InjectRepository(Payslip)
        private payslipRepository: Repository<Payslip>,
        @InjectRepository(PayrollVariable)
        private payrollVariableRepository: Repository<PayrollVariable>,
        @InjectRepository(Contract)
        private contractRepository: Repository<Contract>,
        @InjectRepository(Agent)
        private agentRepository: Repository<Agent>,
        @InjectRepository(BonusTemplate)
        private bonusTemplateRepository: Repository<BonusTemplate>,
        @InjectRepository(ContractBonus)
        private contractBonusRepository: Repository<ContractBonus>,
        @InjectRepository(Attendance)
        private attendanceRepository: Repository<Attendance>,
        @InjectRepository(PayrollRule)
        private payrollRuleRepository: Repository<PayrollRule>,
        private planningService: PlanningService,
        private agentsService: AgentsService,
        private auditService: AuditService,
        private aiAuditor: PayrollAiAuditorService,
        private whatsappService: WhatsappService,
    ) { }

    async generatePayslip(tenantId: string, agentId: number, month: number, year: number): Promise<Payslip> {
        const actorIdSystem = -1;
        const agent = await this.agentsService.findOne(agentId, tenantId, actorIdSystem);
        if (!agent) throw new NotFoundException('Agent not found');

        const contract = await this.contractRepository.findOne({
            where: { agent: { id: agentId } },
            relations: ['bonuses', 'bonuses.bonusTemplate'],
            order: { date_debut: 'DESC' }
        });

        // 1. Delete draft
        await this.payslipRepository.delete({ agent: { id: agentId }, month, year, tenantId });

        // 2. Base Financials
        const baseSalary = contract?.baseSalary || 150000;
        const baseHourlyRate = contract?.hourlyRate || 1200;

        // 3. Process Shifts & Overtime
        const startOfMonth = new Date(year, month - 1, 1);
        const endOfMonth = new Date(year, month, 0, 23, 59, 59);
        const shifts = await this.planningService.getShifts(tenantId, startOfMonth, endOfMonth);
        const agentShifts = shifts.filter(s => s.agent?.id === agent.id);

        const attendances = await this.attendanceRepository.find({
            where: { tenantId, agent: { id: agent.id }, timestamp: Between(startOfMonth, endOfMonth) },
            order: { timestamp: 'ASC' }
        });

        let shiftBonus = 0;
        let nightHours = 0;
        let gardesCount = 0;
        let unjustifiedAbsenceHours = 0;
        let actualWorkedHours = 0;

        for (const shift of agentShifts) {
            // Find IN and OUT punches corresponding to this shift (within 14 hours margin approx)
            const shiftLogs = attendances.filter(a => {
                const diffHours = Math.abs(a.timestamp.getTime() - shift.start.getTime()) / (1000 * 3600);
                return diffHours <= 18; // Wide window to catch the OUT punch
            });

            const inPunch = shiftLogs.find(a => a.type === 'IN');
            const outPunches = shiftLogs.filter(a => a.type === 'OUT');
            let outPunch = outPunches.length > 0 ? outPunches[outPunches.length - 1] : null;

            if (!inPunch) {
                // ABSENT
                const shiftDuration = (shift.end.getTime() - shift.start.getTime()) / (1000 * 3600);
                unjustifiedAbsenceHours += shiftDuration;
                continue; // Process next shift
            }

            if (!outPunch) {
                // CHOIX B : Oubli de pointer OUT
                // On plafonne automatiquement à l'heure de fin théorique + On notifie
                const fakeOut = new Attendance();
                fakeOut.timestamp = shift.end;
                outPunch = fakeOut;

                if (agent.telephone) {
                    this.whatsappService.sendMessage(
                        agent.telephone,
                        `⚠️ *Oubli de Pointage* : Vous n'avez pas badgé votre sortie pour la garde du ${shift.start.toLocaleDateString('fr-FR')}.\nLe système RH a clôturé automatiquement votre heure de fin à l'heure théorique pour calculer le salaire.\nPensez à badger la prochaine fois !`
                    ).catch(() => {});
                }
            }

            // Calcul Effectif
            if (shift.type === 'GARDE') gardesCount++;
            const actualStart = inPunch.timestamp > shift.start ? inPunch.timestamp : shift.start; // S'il est en retard, on prend le chrono réel
            const actualEnd = outPunch.timestamp > shift.end ? shift.end : outPunch.timestamp; // On ne paie pas les débordements non justifiés par un "EXTRA"

            const durationHours = Math.max(0, (actualEnd.getTime() - actualStart.getTime()) / (1000 * 3600));
            actualWorkedHours += durationHours;

            // Retards accumulés
            const theoreticalDuration = (shift.end.getTime() - shift.start.getTime()) / (1000 * 3600);
            if (durationHours < theoreticalDuration) {
                unjustifiedAbsenceHours += (theoreticalDuration - durationHours);
            }

            // Calculate Night Hours Based on Reality
            let current = new Date(actualStart);
            while (current < actualEnd) {
                const hour = current.getHours();
                const isNight = hour >= 21 || hour < 6;
                const nextHour = new Date(current);
                nextHour.setHours(hour + 1, 0, 0, 0);
                if (nextHour > actualEnd) nextHour.setTime(actualEnd.getTime());
                
                const durHours = (nextHour.getTime() - current.getTime()) / (1000 * 3600);
                if (isNight) {
                    nightHours += durHours;
                    shiftBonus += durHours * (baseHourlyRate * 0.25); // +25% majoration de nuit
                }
                current = nextHour;
            }
        }

        // 4. Process Dynamic Contract Bonuses
        let allowances = shiftBonus;
        let taxableAllowances = 0;
        const appliedBonuses = [];

        if (contract?.bonuses) {
            for (const cb of contract.bonuses) {
                const t = cb.bonusTemplate;
                const amt = cb.overrideAmount || t.amount;
                allowances += amt;
                if (t.isTaxable) taxableAllowances += amt;
                
                appliedBonuses.push({ name: t.name, amount: amt, taxable: t.isTaxable });
            }
        }

        const grossSalary = baseSalary + allowances;
        const grossTaxable = baseSalary + taxableAllowances;

        // 5. Moteur de Règles Dynamique (AST - expr-eval)
        const rules = await this.payrollRuleRepository.find({
            where: { tenantId, isActive: true },
            order: { executionOrder: 'ASC' }
        });

        const parser = new Parser();
        // Construire le contexte initial sécurisé
        const context: Record<string, number> = {
            baseSalary,
            allowances,
            taxableAllowances,
            grossSalary,
            GROSS_TAXABLE: grossTaxable,
            nightHours,
            shiftBonus,
            actualWorkedHours,
            actualGardesCount: gardesCount,
            unjustifiedAbsenceHours,
            unpaidAbsencesDeduction: (baseSalary / 173.33) * unjustifiedAbsenceHours // Rule conventionnelle 173.33h/mois
        };

        const taxesCalculated: Record<string, number> = {};
        let totalDeductions = 0;

        for (const rule of rules) {
            try {
                // Evaluer la condition si elle existe
                if (rule.condition && rule.condition.trim() !== '') {
                    const conditionExpr = parser.parse(rule.condition);
                    if (!conditionExpr.evaluate(context)) {
                        continue;
                    }
                }

                // Eval de la formule mathématique
                const expr = parser.parse(rule.formula);
                const result = Math.round(expr.evaluate(context));

                // Stocker le paramètre dans le contexte pour l'étape suivante
                context[rule.code] = result;

                if (rule.type === PayrollRuleType.TAX || rule.type === PayrollRuleType.DEDUCTION) {
                    taxesCalculated[rule.code] = result;
                    totalDeductions += result;
                }
            } catch (err) {
                console.error(`Echec de la règle ${rule.code}:`, err.message);
                // Si l'AST échoue on ne bloque pas pour l'instant
            }
        }

        let netSalary = grossSalary - totalDeductions;


        // 6. Sauvegarde
        const payslip = this.payslipRepository.create({
            agent,
            month,
            year,
            baseSalary,
            allowances, // The total field requires net calculation though in DB model...
            status: PayslipStatus.DRAFT,
            tenantId,
            details: {
                contractId: contract?.id,
                baseSalary,
                grossSalary,
                netSalary, // We persist net here
                taxes: {
                    cnpsTax: taxesCalculated['CNPS_TAX'] || 0,
                    irppTax: taxesCalculated['IRPP_TAX'] || 0, // In dynamic case
                    cacTax: taxesCalculated['CAC_TAX'] || 0, // For compatibility UI
                    tcTax: taxesCalculated['TC_TAX'] || 0, // For compatibility UI
                    ccfTax: taxesCalculated['CCF_TAX'] || 0,
                    ravTax: taxesCalculated['RAV_TAX'] || 0,
                    dynamic: taxesCalculated,
                    totalDeductions
                },
                metrics: {
                    gardesCount,
                    nightHours,
                    shiftBonus
                },
                appliedBonuses
            }
        });

        // HACK for DB storage: store "netSalary" as an absolute number in details
        // Allowances is stored as grossAllowances
        payslip.allowances = allowances;

        // --- Execute AI Audit ---
        const auditReport = await this.aiAuditor.auditPayslip(payslip);
        payslip.details.auditReport = auditReport;

        if (auditReport.anomalies.length > 0) {
            // Flag internal status visually for UI maybe
            // Using a loose boolean flag inside details
            payslip.details.hasAnomalies = true;
        }

        await this.payslipRepository.save(payslip);

        await this.auditService.log(
            tenantId, actorIdSystem, AuditAction.AUTO_GENERATE, AuditEntityType.PAYROLL, agentId.toString(),
            { month, year, netSalary }
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

    async getPayslipById(id: number, tenantId: string): Promise<Payslip | null> {
        return this.payslipRepository.findOne({
            where: { id, tenantId },
            relations: ['agent']
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

    async getBonusTemplates(tenantId: string): Promise<BonusTemplate[]> {
        return this.bonusTemplateRepository.find({ where: { tenantId } });
    }

    async createBonusTemplate(tenantId: string, data: Partial<BonusTemplate>): Promise<BonusTemplate> {
        const tpl = this.bonusTemplateRepository.create({ ...data, tenantId });
        return this.bonusTemplateRepository.save(tpl) as Promise<BonusTemplate>;
    }

    // --- Dynamic Rules ---
    async getPayrollRules(tenantId: string): Promise<PayrollRule[]> {
        return this.payrollRuleRepository.find({
            where: { tenantId },
            order: { executionOrder: 'ASC' }
        });
    }

    async createPayrollRule(tenantId: string, data: Partial<PayrollRule>): Promise<PayrollRule> {
        const rule = this.payrollRuleRepository.create({ ...data, tenantId });
        return this.payrollRuleRepository.save(rule);
    }

    async deletePayrollRule(tenantId: string, id: number): Promise<void> {
        await this.payrollRuleRepository.delete({ id, tenantId });
    }
}
