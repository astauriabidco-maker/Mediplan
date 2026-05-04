import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    managerApi,
    ManagerCockpit,
    ManagerWorklist,
    ProductionObservabilityHealth,
    ServiceComplianceIndicators,
} from '../api/manager.api';
import { ManagerCockpitPage } from './ManagerCockpitPage';
import { renderWithQueryClient } from '../test/render';

vi.mock('../api/manager.api', async () => {
    const actual = await vi.importActual<typeof import('../api/manager.api')>(
        '../api/manager.api',
    );

    return {
        ...actual,
        managerApi: {
            getCockpit: vi.fn(),
        },
    };
});

const period = {
    from: '2026-06-01T00:00:00.000Z',
    to: '2026-06-07T23:59:59.999Z',
};

const buildWorklist = (overrides?: Partial<ManagerWorklist>): ManagerWorklist => ({
    tenantId: 'tenant-a',
    period,
    total: 1,
    counters: {
        REST_INSUFFICIENT: 0,
        WEEKLY_OVERLOAD: 1,
        MISSING_COMPETENCY: 0,
        LEAVE_CONFLICT: 0,
    },
    items: [
        {
            id: 'shift:90:WEEKLY_HOURS_LIMIT_EXCEEDED',
            category: 'WEEKLY_OVERLOAD',
            source: 'SHIFT_VALIDATION',
            severity: 'HIGH',
            agentId: 10,
            shiftId: 90,
            title: 'Surcharge hebdomadaire',
            ruleCode: 'WEEKLY_HOURS_LIMIT_EXCEEDED',
            detectedAt: '2026-06-04T08:00:00.000Z',
        },
    ],
    ...overrides,
});

const buildServiceIndicators = (
    overrides?: Partial<ServiceComplianceIndicators>,
): ServiceComplianceIndicators => ({
    tenantId: 'tenant-a',
    period,
    services: [
        {
            serviceId: 1,
            serviceName: 'Urgences',
            serviceCode: 'URG',
            activeAgents: 12,
            plannedShifts: 42,
            validatedOrPublishedShifts: 35,
            pendingShifts: 7,
            coverageRate: 88,
            weeklyOverloadAgents: 1,
            publishedComplianceRate: 83,
            exceptionsApproved: 0,
            openAlertsBySeverity: {
                HIGH: 1,
                MEDIUM: 1,
                LOW: 0,
            },
        },
        {
            serviceId: 2,
            serviceName: 'Reanimation',
            activeAgents: 8,
            plannedShifts: 30,
            validatedOrPublishedShifts: 30,
            pendingShifts: 0,
            coverageRate: 96,
            weeklyOverloadAgents: 0,
            publishedComplianceRate: 100,
            exceptionsApproved: 1,
            openAlertsBySeverity: {
                HIGH: 0,
                MEDIUM: 1,
                LOW: 0,
            },
        },
    ],
    ...overrides,
});

const buildObservability = (
    overrides?: Partial<ProductionObservabilityHealth>,
): ProductionObservabilityHealth => ({
    tenantId: 'tenant-a',
    generatedAt: '2026-06-04T10:00:00.000Z',
    period,
    status: 'DEGRADED',
    reasons: ['HIGH_ALERTS_OPEN'],
    counters: {
        openAlerts: 3,
        highAlerts: 1,
        mediumAlerts: 2,
        lowAlerts: 0,
        pendingShifts: 7,
        validatedShifts: 35,
        publishedShifts: 30,
        publicationAttempts: 2,
        refusedPublications: 1,
        successfulPublications: 1,
    },
    jobs: {
        complianceScan: {
            configured: true,
            status: 'HEALTHY',
            recentRuns: 4,
            failedRuns: 0,
            lastRunAt: '2026-06-04T10:00:00.000Z',
        },
    },
    ...overrides,
});

const buildCockpit = (overrides?: Partial<ManagerCockpit>): ManagerCockpit => {
    const worklist = buildWorklist();
    const serviceIndicators = buildServiceIndicators();
    const observability = buildObservability();

    return {
        tenantId: 'tenant-a',
        generatedAt: '2026-06-04T10:00:00.000Z',
        period,
        status: 'DEGRADED',
        reasons: ['HIGH_ALERTS_OPEN'],
        counters: {
            openAlerts: 3,
            blockedShifts: 1,
            agentsAtRisk: 2,
            refusedPublications: 1,
            highAlerts: 1,
            mediumAlerts: 2,
            lowAlerts: 0,
            weeklyOverloadAgents: 1,
            pendingCorrections: 1,
            pendingShifts: 7,
            validatedShifts: 35,
            publishedShifts: 30,
            servicesUnderCovered: 1,
            servicesWithOpenAlerts: 2,
        },
        summary: {
            tenantId: 'tenant-a',
            period,
            counters: {
                openAlerts: 3,
                blockedShifts: 1,
                agentsAtRisk: 2,
                refusedPublications: 1,
            },
            openAlertsBySeverity: {
                HIGH: 1,
                MEDIUM: 2,
                LOW: 0,
            },
            blockedShiftPreview: [
                {
                    shiftId: 90,
                    agentId: 10,
                    blockingReasons: ['WEEKLY_HOURS_LIMIT_EXCEEDED'],
                },
            ],
        },
        serviceIndicators,
        worklist,
        observability,
        priorityActions: worklist.items,
        recommendedActions: [
            {
                type: 'REASSIGN_SHIFT',
                label: 'Reassigner le shift',
                shiftId: 90,
                endpoint: {
                    method: 'POST',
                    path: '/planning/shifts/90/reassign',
                },
            },
        ],
        ...overrides,
    };
};

const mockGetCockpit = vi.mocked(managerApi.getCockpit);

afterEach(() => {
    vi.clearAllMocks();
});

describe('ManagerCockpitPage', () => {
    it('affiche les KPI et les services a surveiller quand le cockpit contient des donnees', async () => {
        mockGetCockpit.mockResolvedValue(buildCockpit());

        renderWithQueryClient(<ManagerCockpitPage />);

        expect(await screen.findByText('Cockpit manager')).toBeInTheDocument();
        expect(screen.getByText('Alertes ouvertes')).toBeInTheDocument();
        expect(screen.getByText('Shifts bloques')).toBeInTheDocument();
        expect(screen.getByText('Agents a risque')).toBeInTheDocument();
        expect(screen.getByText('Services a surveiller')).toBeInTheDocument();
        expect(screen.getByText('Urgences')).toBeInTheDocument();
        expect(screen.getByText('Reanimation')).toBeInTheDocument();
        expect(screen.getByText('Actions prioritaires')).toBeInTheDocument();
        expect(screen.getByText('Surcharge hebdomadaire')).toBeInTheDocument();
    });

    it('affiche un etat empty quand aucun signal manager n est remonte', async () => {
        mockGetCockpit.mockResolvedValue(
            buildCockpit({
                status: 'HEALTHY',
                reasons: [],
                counters: {
                    openAlerts: 0,
                    blockedShifts: 0,
                    agentsAtRisk: 0,
                    refusedPublications: 0,
                    highAlerts: 0,
                    mediumAlerts: 0,
                    lowAlerts: 0,
                    weeklyOverloadAgents: 0,
                    pendingCorrections: 0,
                    pendingShifts: 0,
                    validatedShifts: 4,
                    publishedShifts: 12,
                    servicesUnderCovered: 0,
                    servicesWithOpenAlerts: 0,
                },
                serviceIndicators: buildServiceIndicators({ services: [] }),
                priorityActions: [],
                recommendedActions: [],
                worklist: buildWorklist({
                    total: 0,
                    counters: {
                        REST_INSUFFICIENT: 0,
                        WEEKLY_OVERLOAD: 0,
                        MISSING_COMPETENCY: 0,
                        LEAVE_CONFLICT: 0,
                    },
                    items: [],
                }),
                observability: buildObservability({
                    status: 'HEALTHY',
                    reasons: [],
                    counters: {
                        openAlerts: 0,
                        highAlerts: 0,
                        mediumAlerts: 0,
                        lowAlerts: 0,
                        pendingShifts: 0,
                        validatedShifts: 4,
                        publishedShifts: 12,
                        publicationAttempts: 1,
                        refusedPublications: 0,
                        successfulPublications: 1,
                    },
                }),
            }),
        );

        renderWithQueryClient(<ManagerCockpitPage />);

        expect(
            await screen.findByText('Aucun point bloquant sur la periode'),
        ).toBeInTheDocument();
        expect(screen.getByText('Aucune correction prioritaire.')).toBeInTheDocument();
    });

    it('affiche un etat error exploitable quand le cockpit est indisponible', async () => {
        mockGetCockpit.mockRejectedValue(new Error('Service indisponible'));

        renderWithQueryClient(<ManagerCockpitPage />);

        expect(await screen.findByText('Cockpit indisponible')).toBeInTheDocument();
        expect(screen.getByText('Service indisponible')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /recharger/i })).toBeInTheDocument();
    });
});
