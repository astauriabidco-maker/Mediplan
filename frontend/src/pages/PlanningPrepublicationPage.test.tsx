import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    PlanningTimeline,
    PublishPlanningPreview,
    PublishPlanningReport,
    PublishPlanningResult,
} from '../api/planning.api';
import {
    usePlanningComplianceTimeline,
    usePlanningPublicationPreview,
    usePublishPlanningPeriod,
} from '../hooks/usePlanningPublication';
import { PlanningPrepublicationPage } from './PlanningPrepublicationPage';

vi.mock('../hooks/usePlanningPublication', () => ({
    usePlanningComplianceTimeline: vi.fn(),
    usePlanningPublicationPreview: vi.fn(),
    usePublishPlanningPeriod: vi.fn(),
}));

const mockedUsePreview = vi.mocked(usePlanningPublicationPreview);
const mockedUsePublish = vi.mocked(usePublishPlanningPeriod);
const mockedUseTimeline = vi.mocked(usePlanningComplianceTimeline);

const blockedReport: PublishPlanningReport = {
    start: '2026-05-04T00:00:00.000Z',
    end: '2026-05-10T23:59:59.999Z',
    publishable: false,
    totalPending: 3,
    validatedShiftIds: [11],
    violations: [
        {
            shiftId: 21,
            agentId: 7,
            blockingReasons: ['REST_TIME_BEFORE_SHIFT_TOO_SHORT'],
        },
    ],
    warnings: [
        {
            shiftId: 22,
            agentId: 8,
            warnings: ['WEEKLY_HOURS_LIMIT_EXCEEDED'],
            metadata: {
                complianceException: {
                    reason: 'Exception contrôlée validée par cadre',
                },
            },
        },
    ],
    recommendations: ['Réassigner le shift #21 avant publication.'],
};

const publishableReport: PublishPlanningReport = {
    start: '2026-05-04T00:00:00.000Z',
    end: '2026-05-10T23:59:59.999Z',
    publishable: true,
    totalPending: 2,
    validatedShiftIds: [31, 32],
    violations: [],
    warnings: [],
    recommendations: [],
};

const timeline: PlanningTimeline = {
    tenantId: 'tenant-a',
    period: {
        from: '2026-05-04T00:00:00.000Z',
        to: '2026-05-10T23:59:59.999Z',
    },
    filters: {},
    total: 2,
    items: [
        {
            id: 1,
            timestamp: '2026-05-04T10:00:00.000Z',
            actorId: 1,
            action: 'PUBLISH_PLANNING',
            entity: { type: 'planning', id: 'week-19' },
            label: 'Publication refusée: violation bloquante',
            status: 'BLOCKED',
            severity: 'HIGH',
            details: {},
        },
        {
            id: 2,
            timestamp: '2026-05-04T11:00:00.000Z',
            actorId: 1,
            action: 'REASSIGN_SHIFT',
            entity: { type: 'shift', id: '21' },
            label: 'Shift réassigné',
            status: 'DONE',
            details: {},
        },
    ],
};

const previewState = (data: PublishPlanningPreview) => ({
    data,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
});

const publishState = (mutateAsync = vi.fn()) => ({
    mutateAsync,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
    data: null,
});

const timelineState = (refetch = vi.fn()) => ({
    data: timeline,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch,
});

describe('PlanningPrepublicationPage', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    beforeEach(() => {
        vi.clearAllMocks();
        mockedUsePreview.mockReturnValue(previewState({ publishable: false, report: blockedReport }) as any);
        mockedUsePublish.mockReturnValue(publishState() as any);
        mockedUseTimeline.mockReturnValue(timelineState() as any);
    });

    it('shows a non-publishable report with violations, warnings, recommendations and timeline', () => {
        render(<PlanningPrepublicationPage />);

        expect(screen.getByText('Publication bloquée')).toBeTruthy();
        expect(screen.getByText('Violations bloquantes')).toBeTruthy();
        expect(screen.getByText('Warnings et exceptions')).toBeTruthy();
        expect(screen.getByText('Shift #21')).toBeTruthy();
        expect(screen.getByText('Shift #22')).toBeTruthy();
        expect(screen.getByText(/Exception approuvée: Exception contrôlée validée par cadre/i)).toBeTruthy();
        expect(screen.getByText('Réassigner le shift #21 avant publication.')).toBeTruthy();
        expect(screen.getByText('Publication refusée: violation bloquante')).toBeTruthy();
        expect(screen.getByText('Shift réassigné')).toBeTruthy();
        expect((screen.getByTitle('Corrigez les violations bloquantes avant publication.') as HTMLButtonElement).disabled).toBe(true);
    });

    it('allows publishing a publishable report and refreshes the timeline', async () => {
        const publishedResult: PublishPlanningResult = {
            message: 'Planning publié',
            affected: 2,
            report: publishableReport,
        };
        const mutateAsync = vi.fn().mockResolvedValue(publishedResult);
        const refetchTimeline = vi.fn().mockResolvedValue(timeline);
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        mockedUsePreview.mockReturnValue(previewState({ publishable: true, report: publishableReport }) as any);
        mockedUsePublish.mockReturnValue({
            ...publishState(mutateAsync),
            isSuccess: true,
            data: publishedResult,
        } as any);
        mockedUseTimeline.mockReturnValue(timelineState(refetchTimeline) as any);

        const user = userEvent.setup();
        render(<PlanningPrepublicationPage />);

        expect(screen.getByText('Planning publiable')).toBeTruthy();
        const publishButton = screen
            .getAllByRole('button', { name: /publier/i })
            .find((button) => !(button as HTMLButtonElement).disabled);
        expect(publishButton).toBeTruthy();
        await user.click(publishButton as HTMLButtonElement);

        expect(confirmSpy).toHaveBeenCalledWith('Publier ce planning conforme ? Cette action sera auditée.');
        await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
        expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({
            start: expect.any(String),
            end: expect.any(String),
        }));
        await waitFor(() => expect(refetchTimeline).toHaveBeenCalledTimes(1));
        expect(await screen.findByText('Planning publié · 2 shift(s) publié(s).')).toBeTruthy();
    });

    it('shows a readable preview error with retry', async () => {
        const refetch = vi.fn();
        mockedUsePreview.mockReturnValue({
            data: undefined,
            isLoading: false,
            isFetching: false,
            isError: true,
            error: { response: { data: { message: 'Calcul conformité indisponible' } } },
            refetch,
        } as any);

        const user = userEvent.setup();
        render(<PlanningPrepublicationPage />);

        expect(screen.getByText('Impossible de calculer la pré-publication')).toBeTruthy();
        expect(screen.getByText('Calcul conformité indisponible')).toBeTruthy();
        await user.click(screen.getByRole('button', { name: /réessayer le calcul/i }));

        expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('annonce les erreurs de période et marque les champs invalides', () => {
        render(<PlanningPrepublicationPage />);

        const startInput = screen.getByLabelText(/début/i);
        const endInput = screen.getByLabelText(/fin/i);

        fireEvent.change(startInput, { target: { value: '2026-05-10' } });
        fireEvent.change(endInput, { target: { value: '2026-05-04' } });

        expect(screen.getByRole('alert')).toHaveTextContent(
            /date de fin doit être postérieure/i,
        );
        expect(startInput).toHaveAttribute('aria-invalid', 'true');
        expect(endInput).toHaveAttribute('aria-invalid', 'true');
    });
});
