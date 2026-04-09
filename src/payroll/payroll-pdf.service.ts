import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { Payslip } from './entities/payslip.entity';
import { PassThrough } from 'stream';

@Injectable()
export class PayrollPdfService {
    async generatePdf(payslip: Payslip): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ size: 'A4', margin: 50 });
                const pass = new PassThrough();
                const chunks: Buffer[] = [];

                pass.on('data', (chunk) => chunks.push(chunk));
                pass.on('end', () => resolve(Buffer.concat(chunks)));
                pass.on('error', (err) => reject(err));

                doc.pipe(pass);

                // --- Header ---
                doc.fontSize(20).fillColor('#3b82f6').text('MediPlan GHT', { align: 'right' });
                doc.fontSize(10).fillColor('#64748b').text('Direction des Ressources Humaines', { align: 'right' });
                doc.moveDown(2);

                // --- Title ---
                doc.fontSize(18).fillColor('#0f172a').text('FICHE DE PAIE', { align: 'center' });
                doc.fontSize(12).fillColor('#475569').text(`Période : ${this.getMonthName(payslip.month)} ${payslip.year}`, { align: 'center' });
                doc.moveDown(3);

                // --- Agent Info ---
                doc.rect(50, doc.y, 500, 75).fillAndStroke('#f8fafc', '#cbd5e1');
                const startY = doc.y;
                doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold')
                    .text(`Employé(e) : ${payslip.agent.nom} ${payslip.agent.firstName || ''}`, 65, startY + 15);
                doc.fontSize(10).font('Helvetica').fillColor('#475569')
                    .text(`Matricule : ${payslip.agent.id.toString().padStart(6, '0')}   |   Poste : ${payslip.agent.jobTitle || 'N/A'}`, 65, startY + 30);
                doc.fontSize(9).fillColor('#64748b')
                    .text(`NIU : ${payslip.agent.niu || 'Non Renseigné'}   |   N° CNPS : ${payslip.agent.cnpsNumber || 'Non Renseigné'}   |   Classement : ${payslip.agent.categorieEchelon || 'N/A'}`, 65, startY + 45);
                
                doc.y = startY + 90;

                // --- Table Layout Helper ---
                const tableTop = doc.y;
                const colLabel = 50;
                const colQty = 250;
                const colRate = 350;
                const colTotal = 450;
                let currentY = tableTop;

                const drawLine = (y: number) => {
                    doc.moveTo(50, y).lineTo(550, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
                };

                const drawRow = (label: string, qty: string, rate: string, total: string, color = '#0f172a', isBold = false) => {
                    doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fillColor(color).fontSize(10);
                    doc.text(label, colLabel, currentY + 5);
                    doc.text(qty, colQty, currentY + 5, { width: 80, align: 'right' });
                    doc.text(rate, colRate, currentY + 5, { width: 80, align: 'right' });
                    doc.text(total, colTotal, currentY + 5, { width: 100, align: 'right' });
                    currentY += 25;
                };

                // --- Table Header ---
                doc.rect(50, currentY, 500, 25).fill('#f1f5f9');
                drawRow('Désignation', 'Quantité / Base', 'Taux', 'Montant (FCFA)', '#475569', true);
                drawLine(currentY);

                // --- Base Salary ---
                drawRow('Traitement de Base', 'Contrat', '-', `${this.formatMoney(payslip.baseSalary)}`);
                drawLine(currentY);

                // --- Dynamic Bonuses ---
                if (payslip.details?.appliedBonuses?.length) {
                    for (const bonus of payslip.details.appliedBonuses) {
                        const taxLabel = bonus.taxable ? '' : ' (Non-Imposable)';
                        drawRow(`${bonus.name}${taxLabel}`, 'Forfait', '-', `+${this.formatMoney(bonus.amount)}`, '#059669');
                        drawLine(currentY);
                    }
                }

                // --- Night Hours & Shifts ---
                if (payslip.details?.metrics?.shiftBonus > 0) {
                    drawRow('Majoration Heures de Nuit', `${payslip.details.metrics.nightHours} h`, '-', `+${this.formatMoney(payslip.details.metrics.shiftBonus)}`, '#4f46e5');
                    drawLine(currentY);
                }

                // --- Total Brut ---
                currentY += 5;
                doc.rect(50, currentY, 500, 25).fill('#e2e8f0');
                drawRow('TOTAL BRUT', '', '', `${this.formatMoney(payslip.details?.grossSalary || 0)}`, '#0f172a', true);
                currentY += 5;

                // --- Deductions (Taxes) ---
                if (payslip.details?.taxes?.cnpsTax > 0) {
                    drawRow('Cotisation CNPS (4.2%)', 'Retenue légale', '-', `-${this.formatMoney(payslip.details.taxes.cnpsTax)}`, '#e11d48');
                    drawLine(currentY);
                }
                if (payslip.details?.taxes?.irppTax > 0) {
                    drawRow('Impôt sur le Revenu (IRPP)', 'Barème Prog.', '-', `-${this.formatMoney(payslip.details.taxes.irppTax)}`, '#e11d48');
                    drawLine(currentY);
                }
                if (payslip.details?.taxes?.cacTax > 0) {
                    drawRow('Centimes Additionnels (CAC)', '10% de l\'IRPP', '-', `-${this.formatMoney(payslip.details.taxes.cacTax)}`, '#e11d48');
                    drawLine(currentY);
                }
                if (payslip.details?.taxes?.tcTax > 0) {
                    drawRow('Taxe Communale (TC)', 'Forfait Tranche', '-', `-${this.formatMoney(payslip.details.taxes.tcTax)}`, '#e11d48');
                    drawLine(currentY);
                }
                if (payslip.details?.taxes?.ccfTax > 0) {
                    drawRow('Crédit Foncier (CCF - 1%)', 'Brut Taxable', '-', `-${this.formatMoney(payslip.details.taxes.ccfTax)}`, '#e11d48');
                    drawLine(currentY);
                }
                if (payslip.details?.taxes?.ravTax > 0) {
                    drawRow('Redevance (RAV)', "Barème Légal", '-', `-${this.formatMoney(payslip.details.taxes.ravTax)}`, '#e11d48');
                    drawLine(currentY);
                }

                // --- Base Summary (Bas de tableau) ---
                currentY += 10;
                doc.fontSize(8).fillColor('#64748b').text(
                    `Bases - CNPS: ${this.formatMoney(Math.min(payslip.details.grossSalary, 750000))} | IRPP/Taxes: ${this.formatMoney(payslip.details.grossSalary)} | Abatt. Frais Pro: ${this.formatMoney(payslip.details.grossSalary * 0.3)}`,
                    50, currentY
                );

                // --- Total Retenues & Net ---
                currentY += 15;
                
                doc.font('Helvetica-Bold').fontSize(11).fillColor('#64748b');
                doc.text('Total Retenues', 300, currentY, { align: 'right', width: 140 });
                doc.fillColor('#e11d48').text(`-${this.formatMoney(payslip.details?.taxes?.totalDeductions || 0)} FCFA`, 450, currentY, { align: 'right', width: 100 });
                
                currentY += 30;
                
                doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a');
                doc.text('NET A PAYER (Virement)', 200, currentY, { align: 'right', width: 240 });
                doc.fontSize(16).fillColor('#059669').text(`${this.formatMoney(payslip.details?.netSalary || 0)} FCFA`, 450, currentY, { align: 'right', width: 100 });

                // --- Footer ---
                doc.moveTo(50, 750).lineTo(550, 750).strokeColor('#cbd5e1').lineWidth(1).stroke();
                doc.fontSize(8).fillColor('#94a3b8').font('Helvetica');
                doc.text('Pour faire valoir ce que de droit - Document généré électroniquement par MediPlan', 50, 760, { align: 'center' });

                doc.end();
            } catch (err) {
                reject(err);
            }
        });
    }

    private formatMoney(amount: number): string {
        return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    }

    private getMonthName(monthNumber: number): string {
        const date = new Date();
        date.setMonth(monthNumber - 1);
        return date.toLocaleString('fr-FR', { month: 'long' }).toUpperCase();
    }
}
