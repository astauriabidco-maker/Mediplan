import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAgents } from '../api/agents.api';
import {
    CorrectionGuidance,
    fetchShiftCorrectionGuidance,
    runManagerCorrectionAction,
} from '../api/planning.api';
import { useAuth } from '../store/useAuth';
import { ManagerGuidedActions } from './ManagerGuidedActions';

vi.mock('../api/agents.api', () => ({
    fetchAgents: vi.fn(),
}));

vi.mock('../api/planning.api', async () => {
    const actual = await vi.importActual<typeof import('../api/planning.api')>('../api/planning.api');
    return {
        ...actual,
        fetchAlertCorrectionGuidance: vi.fn(),
        fetchShiftCorrectionGuidance: vi.fn(),
        runManagerCorrectionAction: vi.fn(),
    };
});

const mockedFetchAgents = vi.mocked(fetchAgents);
const mockedFetchShiftCorrectionGuidance = vi.mocked(fetchShiftCorrectionGuidance);
const mockedRunManagerCorrectionAction = vi.mocked(runManagerCorrectionAction);

const managerGuidance: CorrectionGuidance = {
    tenantId: 'tenant-a',
    problem: {
        type: 'SHIFT',
        id: 42,
        title: 'Repos insuffisant avant garde',
        severity: 'HIGH',
        shiftId: 42,
        agentId: 7,
    },
    reasons: ['REST_TIME_BEFORE_SHIFT_TOO_SHORT'],
    validation: {
        isValid: false,
        blockingReasons: ['REST_TIME_BEFORE_SHIFT_TOO_SHORT'],
        warnings: [],
    },
    availableActions: [
        {
            code: 'APPROVE_EXCEPTION',
            label: 'Autoriser exception',
            description: 'Autoriser avec justification manager',
            permissions: ['planning:exception'],
            method: 'POST',
            endpoint: '/planning/shifts/42/exception',
            body: { reason: { type: 'string', required: true } },
        },
        {
            code: 'REQUEST_REPLACEMENT',
            label: 'Demander remplacement',
            description: 'Créer une demande de remplacement',
            permissions: ['planning:update'],
            method: 'POST',
            endpoint: '/planning/shifts/42/request-replacement',
        },
        {
            code: 'REVALIDATE_SHIFT',
            label: 'Relancer validation',
            description: 'Relancer la validation conformité du shift',
            permissions: ['planning:update'],
            method: 'POST',
            endpoint: '/planning/shifts/42/revalidate',
        },
    ],
};

const createQueryClient = () => new QueryClient({
    defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
    },
});

const renderGuidedActions = (onCompleted = vi.fn()) => {
    const queryClient = createQueryClient();

    return {
        onCompleted,
        user: userEvent.setup(),
        ...render(
            <QueryClientProvider client={queryClient}>
                <ManagerGuidedActions target={{ type: 'SHIFT', id: 42 }} onCompleted={onCompleted} />
            </QueryClientProvider>
        ),
    };
};

describe('ManagerGuidedActions', () => {
    afterEach(() => {
        cleanup();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        useAuth.setState({
            token: 'token',
            user: {
                id: 1,
                email: 'manager@hospital.test',
                tenantId: 'tenant-a',
                role: 'ADMIN',
                permissions: ['planning:read', 'planning:update', 'planning:exception'],
            },
            impersonatedTenantId: null,
        });
        mockedFetchAgents.mockResolvedValue([]);
        mockedFetchShiftCorrectionGuidance.mockResolvedValue(managerGuidance);
        mockedRunManagerCorrectionAction.mockResolvedValue({ ok: true });
    });

    it('requires a justification before approving a controlled exception', async () => {
        const completed = vi.fn();
        const { user } = renderGuidedActions(completed);

        await user.click(await screen.findByRole('button', { name: /autoriser exception/i }));
        expect(screen.getByText(/justification obligatoire/i)).toBeTruthy();

        const confirmButton = screen.getByRole('button', { name: /confirmer/i }) as HTMLButtonElement;
        expect(confirmButton.disabled).toBe(true);
        expect(mockedRunManagerCorrectionAction).not.toHaveBeenCalled();

        await user.type(screen.getByPlaceholderText(/documenter la décision manager/i), 'Service saturé, exception validée par cadre.');
        expect(confirmButton.disabled).toBe(false);
        await user.click(confirmButton);

        await waitFor(() => expect(mockedRunManagerCorrectionAction).toHaveBeenCalledTimes(1));
        expect(mockedRunManagerCorrectionAction).toHaveBeenCalledWith(
            expect.objectContaining({ code: 'APPROVE_EXCEPTION' }),
            { agentId: undefined, reason: 'Service saturé, exception validée par cadre.' }
        );
        expect(completed).toHaveBeenCalledWith('Autoriser exception effectuée.');
    });

    it('shows readable API errors when a guided action fails', async () => {
        mockedRunManagerCorrectionAction.mockRejectedValueOnce({
            response: { data: { message: ['Shift déjà traité', 'Validation impossible'] } },
        });
        const { user } = renderGuidedActions();

        await user.click(await screen.findByRole('button', { name: /demander remplacement/i }));
        await user.click(screen.getByRole('button', { name: /confirmer/i }));

        expect(await screen.findByText('Shift déjà traité, Validation impossible')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: /réessayer l'action/i }));
        await waitFor(() => expect(mockedRunManagerCorrectionAction).toHaveBeenCalledTimes(2));
    });

    it('nomme le dialogue d action et permet de le fermer au clavier', async () => {
        const { user } = renderGuidedActions();

        await user.click(await screen.findByRole('button', { name: /autoriser exception/i }));

        expect(
            screen.getByRole('dialog', { name: /autoriser exception/i }),
        ).toHaveAttribute('aria-modal', 'true');

        await user.keyboard('{Escape}');

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('triggers replacement and revalidation actions from the guidance contract', async () => {
        const { user, unmount } = renderGuidedActions();

        await user.click(await screen.findByRole('button', { name: /demander remplacement/i }));
        await user.click(screen.getByRole('button', { name: /confirmer/i }));

        await waitFor(() => expect(mockedRunManagerCorrectionAction).toHaveBeenCalledWith(
            expect.objectContaining({ code: 'REQUEST_REPLACEMENT' }),
            { agentId: undefined, reason: undefined }
        ));

        mockedRunManagerCorrectionAction.mockClear();
        unmount();
        render(
            <QueryClientProvider client={createQueryClient()}>
                <ManagerGuidedActions target={{ type: 'SHIFT', id: 42 }} />
            </QueryClientProvider>
        );

        await user.click(await screen.findByRole('button', { name: /relancer validation/i }));
        await user.click(screen.getByRole('button', { name: /confirmer/i }));

        await waitFor(() => expect(mockedRunManagerCorrectionAction).toHaveBeenCalledWith(
            expect.objectContaining({ code: 'REVALIDATE_SHIFT' }),
            { agentId: undefined, reason: undefined }
        ));
    });
});
