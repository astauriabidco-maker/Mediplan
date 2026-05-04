import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAgents } from '../api/agents.api';
import {
    CorrectionGuidance,
    managerApi,
    ManagerWorklist,
} from '../api/manager.api';
import { renderWithQueryClient } from '../test/render';
import { ManagerWorklistPage } from './ManagerWorklistPage';

vi.mock('../api/agents.api', () => ({
    fetchAgents: vi.fn(),
}));

vi.mock('../api/manager.api', async () => {
    const actual = await vi.importActual<typeof import('../api/manager.api')>(
        '../api/manager.api',
    );

    return {
        ...actual,
        managerApi: {
            getWorklist: vi.fn(),
            getShiftGuidance: vi.fn(),
            getAlertGuidance: vi.fn(),
        },
    };
});

const period = {
    from: '2026-06-01T00:00:00.000Z',
    to: '2026-06-07T23:59:59.999Z',
};

const worklist: ManagerWorklist = {
    tenantId: 'tenant-a',
    period,
    total: 3,
    counters: {
        REST_INSUFFICIENT: 1,
        WEEKLY_OVERLOAD: 1,
        MISSING_COMPETENCY: 1,
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
            metadata: {
                weeklyHours: 56,
                weeklyLimit: 48,
            },
        },
        {
            id: 'alert:44:MISSING_COMPETENCY',
            category: 'MISSING_COMPETENCY',
            source: 'ALERT',
            severity: 'MEDIUM',
            agentId: 11,
            alertId: 44,
            title: 'Competence manquante',
            ruleCode: 'MISSING_COMPETENCY',
            detectedAt: '2026-06-04T09:00:00.000Z',
        },
        {
            id: 'shift:91:REST_PERIOD_TOO_SHORT',
            category: 'REST_INSUFFICIENT',
            source: 'SHIFT_VALIDATION',
            severity: 'LOW',
            agentId: 12,
            shiftId: 91,
            title: 'Repos insuffisant',
            ruleCode: 'REST_PERIOD_TOO_SHORT',
            detectedAt: '2026-06-05T09:00:00.000Z',
        },
    ],
};

const guidance: CorrectionGuidance = {
    tenantId: 'tenant-a',
    problem: {
        type: 'SHIFT',
        id: 90,
        title: 'Surcharge hebdomadaire',
        severity: 'HIGH',
        agentId: 10,
        shiftId: 90,
    },
    reasons: ['WEEKLY_HOURS_LIMIT_EXCEEDED'],
    validation: {
        isValid: false,
        blockingReasons: ['WEEKLY_HOURS_LIMIT_EXCEEDED'],
        warnings: [],
        metadata: {
            weeklyHours: 56,
            weeklyLimit: 48,
        },
    },
    availableActions: [
        {
            code: 'REASSIGN_SHIFT',
            label: 'Reassigner le shift',
            description: 'Choisir un agent disponible et conforme.',
            permissions: ['planning:write'],
            method: 'POST',
            endpoint: '/planning/shifts/90/reassign',
            body: {
                agentId: 12,
            },
        },
    ],
};

const mockGetWorklist = vi.mocked(managerApi.getWorklist);
const mockGetShiftGuidance = vi.mocked(managerApi.getShiftGuidance);
const mockGetAlertGuidance = vi.mocked(managerApi.getAlertGuidance);
const mockFetchAgents = vi.mocked(fetchAgents);

const renderWorklist = () => {
    mockGetWorklist.mockResolvedValue(worklist);
    mockFetchAgents.mockResolvedValue([
        {
            id: 10,
            nom: 'Nadia Martin',
            email: 'nadia@example.test',
            matricule: 'A10',
            telephone: '0102030405',
            tenantId: 'tenant-a',
        },
        {
            id: 11,
            nom: 'Paul Bernard',
            email: 'paul@example.test',
            matricule: 'A11',
            telephone: '0102030406',
            tenantId: 'tenant-a',
        },
        {
            id: 12,
            nom: 'Sara Diallo',
            email: 'sara@example.test',
            matricule: 'A12',
            telephone: '0102030407',
            tenantId: 'tenant-a',
        },
    ]);
    mockGetShiftGuidance.mockResolvedValue(guidance);
    mockGetAlertGuidance.mockResolvedValue({
        ...guidance,
        problem: {
            type: 'ALERT',
            id: 44,
            title: 'Competence manquante',
            severity: 'MEDIUM',
            agentId: 11,
            alertId: 44,
        },
        reasons: ['MISSING_COMPETENCY'],
        availableActions: [
            {
                code: 'RESOLVE_ALERT',
                label: 'Resoudre alerte',
                description: 'Cloturer avec justification.',
                permissions: ['planning:write'],
                method: 'PATCH',
                endpoint: '/planning/alerts/44/resolve',
            },
        ],
    });

    return renderWithQueryClient(<ManagerWorklistPage />);
};

afterEach(() => {
    vi.clearAllMocks();
});

describe('ManagerWorklistPage', () => {
    it('affiche les items ouverts et les compteurs de categories', async () => {
        renderWorklist();

        expect(screen.getByText('À corriger avant publication')).toBeInTheDocument();
        await waitFor(() => {
            expect(mockGetWorklist).toHaveBeenCalled();
            expect(screen.getByText('3 item(s) affiché(s) sur 3')).toBeInTheDocument();
        }, { timeout: 5000 });
        expect(screen.getAllByText(/surcharge hebdo|surcharge hebdomadaire/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/competence manquante/i)).toBeInTheDocument();
        expect(screen.getAllByText(/repos insuffisant/i).length).toBeGreaterThan(0);
        expect(screen.getByText('Nadia Martin')).toBeInTheDocument();
    });

    it('filtre les items par categorie et criticite', async () => {
        const user = userEvent.setup();
        renderWorklist();

        await screen.findByText('Surcharge hebdomadaire');
        const categoryFilter = screen.getByRole('combobox', { name: /type de problème/i });
        const severityFilter = screen.getByRole('combobox', { name: /criticité/i });

        await user.selectOptions(categoryFilter, 'MISSING_COMPETENCY');

        expect(
            screen.getByRole('button', { name: /competence manquante/i }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /surcharge hebdomadaire/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /repos insuffisant/i }),
        ).not.toBeInTheDocument();

        await user.selectOptions(categoryFilter, 'ALL');
        await user.selectOptions(severityFilter, 'LOW');

        expect(
            screen.getByRole('button', { name: /repos insuffisant/i }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /competence manquante/i }),
        ).not.toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /surcharge hebdomadaire/i }),
        ).not.toBeInTheDocument();
    });

    it('ouvre le guidage de correction quand un item shift est selectionne', async () => {
        const user = userEvent.setup();
        renderWorklist();

        await user.click(await screen.findByRole('button', {
            name: /surcharge hebdomadaire/i,
        }));

        await waitFor(() => {
            expect(mockGetShiftGuidance).toHaveBeenCalledWith(90);
        });

        expect(screen.getAllByText('WEEKLY_HOURS_LIMIT_EXCEEDED').length).toBeGreaterThan(0);
        expect(screen.getByText('Validation structurée')).toBeInTheDocument();
        expect(screen.getByText('Bloquant')).toBeInTheDocument();
        expect(screen.getByText('Reassigner le shift')).toBeInTheDocument();
        expect(screen.getByText('/planning/shifts/90/reassign')).toBeInTheDocument();
    });

    it('expose des filtres nommes et l item selectionne aux technologies d assistance', async () => {
        const user = userEvent.setup();
        renderWorklist();

        expect(await screen.findByRole('textbox', { name: /rechercher dans la file manager/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /type de problème/i })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: /trier la file manager/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/date de début de la file manager/i)).toBeInTheDocument();

        const itemButton = await screen.findByRole('button', {
            name: /ouvrir le guidage pour surcharge hebdomadaire/i,
        });
        expect(itemButton).toHaveAttribute('aria-pressed', 'false');

        await user.click(itemButton);

        expect(itemButton).toHaveAttribute('aria-pressed', 'true');
    });
});
