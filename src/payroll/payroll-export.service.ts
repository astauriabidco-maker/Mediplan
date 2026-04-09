import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payslip } from './entities/payslip.entity';
import { format } from 'date-fns';

@Injectable()
export class PayrollExportService {
    constructor(
        @InjectRepository(Payslip)
        private payslipRepo: Repository<Payslip>,
    ) {}

    async generateSageExport(month: number, year: number, tenantId: string): Promise<string> {
        const payslips = await this.payslipRepo.find({
            where: { month, year, tenantId },
            relations: ['agent']
        });

        if (payslips.length === 0) {
            return '';
        }

        // Totaux centralisés
        let totalBaseSalary = 0;
        let totalAllowances = 0;
        let totalCnps = 0;
        let totalTaxes = 0; // IRPP, CAC, etc.

        // Lignes détaillées (Nets à payer)
        const detailedNetLines = [];

        const dateStr = format(new Date(year, month - 1, 28), 'ddMMyy'); // En fin de mois généralement

        for (const p of payslips) {
            totalBaseSalary += p.baseSalary || 0;
            totalAllowances += p.allowances || 0;
            
            const taxes = p.details?.taxes || {};
            const cnps = taxes.cnpsTax || 0;
            totalCnps += cnps;

            const autresTaxes = (taxes.irppTax || 0) + (taxes.cacTax || 0) + (taxes.tcTax || 0) + (taxes.ccfTax || 0) + (taxes.ravTax || 0);
            totalTaxes += autresTaxes;

            const netSalary = p.details?.netSalary || 0;
            if (netSalary > 0) {
                detailedNetLines.push({
                    account: '422000',
                    libelle: `NET A PAYER - ${p.agent.firstName} ${p.agent.lastName}`.substring(0, 30),
                    debit: 0,
                    credit: netSalary
                });
            }
        }

        // Construction des lignes du fichier CSV SAGE
        const lines = [];
        const header = `"Code Journal";"Date";"Compte";"Libellé";"Débit";"Crédit"`;
        lines.push(header);

        const journal = "OD";

        // 1. Débit : Salaires de Base
        if (totalBaseSalary > 0) {
            lines.push(`"${journal}";"${dateStr}";"661000";"SALAIRES DE BASE CENTRALISES";"${Math.round(totalBaseSalary)}";"0"`);
        }

        // 2. Débit : Primes & Heures Supp
        if (totalAllowances > 0) {
            lines.push(`"${journal}";"${dateStr}";"663000";"PRIMES ET INDEMNITES CENTRALISEES";"${Math.round(totalAllowances)}";"0"`);
        }

        // 3. Crédit : CNPS
        if (totalCnps > 0) {
            lines.push(`"${journal}";"${dateStr}";"431000";"CNPS CENTRALISÉE";"0";"${Math.round(totalCnps)}"`);
        }

        // 4. Crédit : État/Impôts
        if (totalTaxes > 0) {
            lines.push(`"${journal}";"${dateStr}";"442000";"IMPOTS ET TAXES CENTRALISÉS";"0";"${Math.round(totalTaxes)}"`);
        }

        // 5. Crédit Détaillé : Salaires Nets individuels
        for (const netLine of detailedNetLines) {
            lines.push(`"${journal}";"${dateStr}";"${netLine.account}";"${netLine.libelle}";"0";"${Math.round(netLine.credit)}"`);
        }

        // Assemblage final avec BOM pour forcer Excel en UTF-8
        return '\uFEFF' + lines.join('\n');
    }

    async generateDipeExport(month: number, year: number, tenantId: string): Promise<string> {
        const payslips = await this.payslipRepo.find({
            where: { month, year, tenantId },
            relations: ['agent']
        });

        if (payslips.length === 0) {
            return '';
        }

        const lines = [];
        const header = `"Matricule";"Nom Complet";"Heures Travaillées";"Salaire Brut Taxable";"Retenue CNPS";"Retenue IRPP";"Total Déductions";"Net à Payer"`;
        lines.push(header);

        for (const p of payslips) {
            const agent = p.agent;
            const details = p.details || {};
            const taxes = details.taxes || {};
            const metrics = details.metrics || {};

            const matricule = agent.id.toString().padStart(4, '0');
            const nomComplet = `${agent.firstName} ${agent.lastName}`;
            const heures = metrics.actualWorkedHours || 173.33; // Default OHADA
            const brutTaxable = details.grossTaxable || p.baseSalary + p.allowances;
            const cnps = taxes.cnpsTax || 0;
            const irpp = taxes.irppTax || 0;
            const totalDeductions = taxes.totalDeductions || 0;
            const net = details.netSalary || 0;

            lines.push(`"${matricule}";"${nomComplet}";"${Math.round(heures)}";"${Math.round(brutTaxable)}";"${Math.round(cnps)}";"${Math.round(irpp)}";"${Math.round(totalDeductions)}";"${Math.round(net)}"`);
        }

        return '\uFEFF' + lines.join('\n');
    }
}
