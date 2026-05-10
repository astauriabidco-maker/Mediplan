import { describe, expect, it } from 'vitest';
import {
  SPRINT36_COMMERCIAL_DEMO_TENANT_ID,
  Sprint36CommercialDemoGuardError,
  isSprint36CommercialDemoTenant,
  isSprint36SensitiveDemoExportPath,
} from './sprint36CommercialDemo';

describe('sprint36CommercialDemo', () => {
  it('identifies only the separated commercial demo tenant', () => {
    expect(
      isSprint36CommercialDemoTenant(SPRINT36_COMMERCIAL_DEMO_TENANT_ID),
    ).toBe(true);
    expect(isSprint36CommercialDemoTenant('tenant-demo-critique')).toBe(false);
    expect(isSprint36CommercialDemoTenant(undefined)).toBe(false);
  });

  it('marks sensitive import/export endpoints as blocked in demo', () => {
    expect(isSprint36SensitiveDemoExportPath('/api/tenant-backups/export')).toBe(
      true,
    );
    expect(isSprint36SensitiveDemoExportPath('/api/payroll/export/sage')).toBe(
      true,
    );
    expect(isSprint36SensitiveDemoExportPath('/api/ops/summary')).toBe(false);
  });

  it('uses an explicit guard error for blocked commercial demo flows', () => {
    expect(new Sprint36CommercialDemoGuardError().message).toContain(
      'bloque',
    );
  });
});
