import { describe, expect, it } from 'vitest';
import {
  PILOT_OPS_DEMO_TENANTS,
  buildPilotOpsCriticalSummary,
  buildPilotOpsDemoMultiTenantSummary,
  pilotOpsCriticalRunbook,
  pilotOpsDemoTenantLabels,
  pilotOpsDemoTenantOrder,
  pilotOpsDemoTenants,
} from './ops-pilot-demo.mock';
import type { OpsDashboardSummary } from '../ops.api';

const baseSummary = {
  tenantId: 'tenant-a',
  generatedAt: '2026-05-05T08:00:00.000Z',
  status: 'OPERATIONAL',
  statusLabel: 'Opérationnel',
  health: {
    api: null,
    observability: {
      tenantId: 'tenant-a',
      generatedAt: '2026-05-05T08:00:00.000Z',
      period: {},
      status: 'HEALTHY',
      reasons: [],
      counters: {
        openAlerts: 0,
        highAlerts: 0,
        mediumAlerts: 0,
        lowAlerts: 0,
        pendingShifts: 0,
        validatedShifts: 0,
        publishedShifts: 0,
        publicationAttempts: 0,
        refusedPublications: 0,
        successfulPublications: 0,
      },
      jobs: {},
    },
    readiness: null,
  },
  kpis: [],
  alerts: [],
  anomalies: [],
  sla: [],
  backups: {
    status: 'OK',
    exportable: true,
    datasetCounts: {},
    totals: {},
  },
  incidents: [],
  notifications: {
    status: 'OK',
    label: 'Aucun signal',
    detail: 'Aucune notification active.',
    pendingAlerts: 0,
    escalatedIncidents: 0,
    acknowledgedNotifications: 0,
    reminders: 0,
    quietHoursDeferred: 0,
    failedNotifications: 0,
    entries: [],
  },
  actionCenter: {
    available: true,
    status: 'OK',
    total: 0,
    items: [],
  },
  routines: {
    available: true,
    status: 'OK',
    title: 'Routines ops',
    items: [],
  },
  directionReports: {
    available: true,
    status: 'OK',
    title: 'Rapports direction',
    reports: [],
    command: 'node scripts/management-business-report.mjs',
    reportPattern: 'business-reports/*.md',
  },
  gates: [],
  gatesSummary: {
    passed: 0,
    failed: 0,
    unknown: 0,
    total: 0,
  },
} satisfies OpsDashboardSummary;

describe('pilot ops demo fixtures', () => {
  it('stabilise trois tenants pilotes sain, warning et critique pour Ops', () => {
    const summary = buildPilotOpsDemoMultiTenantSummary();

    expect(
      pilotOpsDemoTenantOrder.map((state) => pilotOpsDemoTenantLabels[state]),
    ).toEqual(['Sain', 'Warning', 'Critique']);
    expect(summary.totals).toEqual({
      tenants: 3,
      criticalTenants: 1,
      warningTenants: 1,
      openAlerts: 4,
      activeIncidents: 1,
      failedRoutines: 1,
      actionCenterItems: 3,
    });
    expect(summary.tenants.map((tenant) => tenant.tenantId)).toEqual([
      PILOT_OPS_DEMO_TENANTS.healthy,
      PILOT_OPS_DEMO_TENANTS.warning,
      PILOT_OPS_DEMO_TENANTS.critical,
    ]);
    expect(pilotOpsDemoTenants.healthy).toEqual(
      expect.objectContaining({
        status: 'OK',
        alerts: expect.objectContaining({ open: 0, critical: 0 }),
        incidents: expect.objectContaining({ active: 0 }),
      }),
    );
    expect(pilotOpsDemoTenants.warning).toEqual(
      expect.objectContaining({
        status: 'WARNING',
        alerts: expect.objectContaining({ open: 1, critical: 0 }),
        actionCenter: expect.objectContaining({ total: 1, critical: 0 }),
      }),
    );
    expect(pilotOpsDemoTenants.critical).toEqual(
      expect.objectContaining({
        status: 'CRITICAL',
        alerts: expect.objectContaining({ open: 3, critical: 1 }),
        incidents: expect.objectContaining({ active: 1, escalated: 1 }),
        routines: expect.objectContaining({ failed: 1 }),
        actionCenter: expect.objectContaining({ total: 2, critical: 1 }),
      }),
    );
  });

  it('rattache le tenant critique au SLO, a l action-center et au runbook auditables', () => {
    const criticalSummary = buildPilotOpsCriticalSummary(baseSummary);

    expect(criticalSummary.tenantId).toBe(PILOT_OPS_DEMO_TENANTS.critical);
    expect(criticalSummary.sla[0]).toEqual(
      expect.objectContaining({
        label: 'Résolution alerte critique',
        status: 'CRITICAL',
        sloStatus: 'FAILED',
        current: '47min',
      }),
    );
    expect(criticalSummary.actionCenter.items[0]).toEqual(
      expect.objectContaining({
        id: 'operational-alert-12',
        priority: 'CRITICAL',
        status: 'WAITING_EVIDENCE',
        sourceReference: expect.objectContaining({
          tenantId: PILOT_OPS_DEMO_TENANTS.critical,
          reference: 'slo:api:p95:rea',
        }),
      }),
    );
    expect(pilotOpsCriticalRunbook.requiredPermissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ permission: 'operations:write' }),
        expect.objectContaining({ permission: 'audit:read' }),
      ]),
    );
    expect(pilotOpsCriticalRunbook.expectedEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Preuve retour nominal' }),
        expect.objectContaining({ label: 'Journal audit immuable' }),
      ]),
    );
  });
});
