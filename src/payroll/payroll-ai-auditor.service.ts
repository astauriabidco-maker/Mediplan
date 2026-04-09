import { Injectable, Logger } from '@nestjs/common';
import { Payslip } from './entities/payslip.entity';

export interface AuditReport {
    isCompliant: boolean;
    confidenceScore: number;
    anomalies: string[];
    recommendations: string[];
}

@Injectable()
export class PayrollAiAuditorService {
    private readonly logger = new Logger(PayrollAiAuditorService.name);

    /**
     * Analyse le JSON complet d'une fiche de paie générée
     * @param payslip 
     * @returns AuditReport
     */
    async auditPayslip(payslip: Payslip): Promise<AuditReport> {
        this.logger.log(`Début de l'audit IA pour le matricule ${payslip.agent?.id}`);
        // 1. Structure the payload
        const payload = {
            baseSalary: payslip.baseSalary,
            allowances: payslip.allowances,
            taxes: payslip.details?.taxes,
            net: payslip.details?.netSalary,
            gross: payslip.details?.grossSalary
        };

        // 2. Here we would call the LLM / Inference Engine via Axios
        // For example:
        // const response = await axios.post('https://api.openai.com/v1/chat/completions', { ... })
        // or Ollama locally
        
        // 3. Fallback AI Audit logic (Simulated LLM heuristics rules)
        const anomalies: string[] = [];
        const recommendations: string[] = [];
        
        // Check 1: CNPS Hard Cap
        if (payload.gross > 750000 && payload.taxes?.cnpsTax > (750000 * 0.042)) {
            anomalies.push("La cotisation CNPS dépasse le plafond légal de 750.000 FCFA.");
        }

        // Check 2: Deductions coherence
        const mathematicalDeductions = (payload.gross || 0) - (payload.net || 0);
        const engineDeductions = payload.taxes?.totalDeductions || 0;
        
        if (Math.abs(mathematicalDeductions - engineDeductions) > 10) {
            anomalies.push("Incohérence détectée entre le Net versé et les déductions calculées par l'AST.");
            recommendations.push("Vérifiez que toutes les règles AST de type TAX ont un ExecutionOrder valide.");
        }

        // Check 3: Missing taxes for Cameroon
        if (!payload.taxes?.irppTax && payload.gross > 100000) {
            anomalies.push("Attention : Aucun IRPP n'a été calculé pour un salaire brut imposable > 100k.");
            recommendations.push("Vérifiez l'état d'activation de la règle IRPP_BASE ou demandez à l'administrateur de l'activer.");
        }

        const isCompliant = anomalies.length === 0;

        return {
            isCompliant,
            confidenceScore: isCompliant ? 0.98 : 0.45,
            anomalies,
            recommendations
        };
    }
}
