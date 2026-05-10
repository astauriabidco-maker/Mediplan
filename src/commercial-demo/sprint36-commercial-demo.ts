import { ForbiddenException } from '@nestjs/common';

export const SPRINT36_COMMERCIAL_DEMO_TENANT_ID =
  'MEDIPLAN-DEMO-COMMERCIALE-S36';

export function isSprint36CommercialDemoTenant(
  tenantId?: string | null,
): boolean {
  return tenantId === SPRINT36_COMMERCIAL_DEMO_TENANT_ID;
}

export function assertSprint36SensitiveExportAllowed(tenantId: string): void {
  if (isSprint36CommercialDemoTenant(tenantId)) {
    throw new ForbiddenException(
      'Import/export sensible bloque pour le tenant demo commerciale Sprint 36',
    );
  }
}
