export const SPRINT36_COMMERCIAL_DEMO_TENANT_ID =
  'MEDIPLAN-DEMO-COMMERCIALE-S36';

export const SPRINT36_COMMERCIAL_DEMO_LABEL =
  'Demo commerciale Sprint 36';

export const SPRINT36_COMMERCIAL_DEMO_NOTICE =
  'Donnees fictives: aucune donnee patient, RH ou paie reelle.';

const SENSITIVE_DEMO_EXPORT_PATHS = [
  '/api/tenant-backups/export',
  '/api/tenant-backups/import',
  '/api/audit/export',
  '/api/payroll/export/sage',
  '/api/payroll/export/dipe',
  '/api/payroll/payslips/',
];

export const isSprint36CommercialDemoTenant = (
  tenantId?: string | null,
): boolean => tenantId === SPRINT36_COMMERCIAL_DEMO_TENANT_ID;

export const isSprint36SensitiveDemoExportPath = (
  url?: string | null,
): boolean => {
  if (!url) return false;
  return SENSITIVE_DEMO_EXPORT_PATHS.some((path) => url.includes(path));
};

export class Sprint36CommercialDemoGuardError extends Error {
  constructor() {
    super(
      'Import/export sensible bloque pour le tenant demo commerciale Sprint 36.',
    );
    this.name = 'Sprint36CommercialDemoGuardError';
  }
}
