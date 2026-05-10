import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { submitDemoRequest } from '../api/demo-request.api';
import { DemoRequestPage } from './DemoRequestPage';

vi.mock('../api/demo-request.api', () => ({
    submitDemoRequest: vi.fn(),
}));

const mockedSubmitDemoRequest = vi.mocked(submitDemoRequest);

const renderPage = () =>
    render(
        <MemoryRouter>
            <DemoRequestPage />
        </MemoryRouter>,
    );

const fillValidForm = async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/nom/i), 'Camille Martin');
    await user.type(screen.getByLabelText(/email pro/i), 'camille@chu-test.fr');
    await user.type(screen.getByLabelText(/établissement/i), 'CHU Test');
    await user.selectOptions(screen.getByLabelText(/rôle/i), 'rh');
    await user.type(
        screen.getByLabelText(/message/i),
        'Nous souhaitons qualifier une démonstration pour un service pilote.',
    );
    await user.type(screen.getByLabelText(/anti-spam/i), '7');
    await user.click(screen.getByLabelText(/j'accepte/i));

    return user;
};

describe('DemoRequestPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedSubmitDemoRequest.mockResolvedValue(undefined);
    });

    it('submits a complete commercial demo request', async () => {
        const user = await fillValidForm();
        await user.click(screen.getByRole('button', { name: /envoyer la demande/i }));

        await waitFor(() => expect(mockedSubmitDemoRequest).toHaveBeenCalledTimes(1));
        expect(mockedSubmitDemoRequest).toHaveBeenCalledWith({
            organizationName: 'CHU Test',
            organizationType: 'HOSPITAL',
            staffRange: '200_499',
            country: 'FR',
            contactFirstName: 'Camille',
            contactLastName: 'Martin',
            jobTitle: 'Ressources humaines',
            workEmail: 'camille@chu-test.fr',
            message:
                'Nous souhaitons qualifier une démonstration pour un service pilote.',
            consentToBeContacted: true,
        });
        expect(await screen.findByText(/demande envoyée/i)).toBeTruthy();
    });

    it('blocks the demo request without explicit consent', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.type(screen.getByLabelText(/nom/i), 'Camille Martin');
        await user.type(screen.getByLabelText(/email pro/i), 'camille@chu-test.fr');
        await user.type(screen.getByLabelText(/établissement/i), 'CHU Test');
        await user.selectOptions(screen.getByLabelText(/rôle/i), 'direction');
        await user.type(screen.getByLabelText(/message/i), 'Demande de démo.');
        await user.type(screen.getByLabelText(/anti-spam/i), '7');
        await user.click(screen.getByRole('button', { name: /envoyer la demande/i }));

        expect(mockedSubmitDemoRequest).not.toHaveBeenCalled();
        expect(screen.queryByText(/demande envoyée/i)).not.toBeInTheDocument();
    });

    it('keeps the confirmation neutral and does not display submitted lead details', async () => {
        const user = await fillValidForm();
        await user.click(screen.getByRole('button', { name: /envoyer la demande/i }));

        expect(await screen.findByText(/demande envoyée/i)).toBeTruthy();
        expect(screen.queryByText('Camille Martin')).not.toBeInTheDocument();
        expect(screen.queryByText('camille@chu-test.fr')).not.toBeInTheDocument();
        expect(screen.queryByText('CHU Test')).not.toBeInTheDocument();
    });

    it('does not ask prospects for sensitive healthcare or HR data', () => {
        renderPage();

        expect(screen.queryByLabelText(/patient/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/matricule/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/sécurité sociale/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/bulletin/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/contrat/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/planning nominatif/i)).not.toBeInTheDocument();
    });

    it('rejects personal email domains before calling the API', async () => {
        const user = userEvent.setup();
        renderPage();

        await user.type(screen.getByLabelText(/nom/i), 'Camille Martin');
        await user.type(screen.getByLabelText(/email pro/i), 'camille@gmail.com');
        await user.type(screen.getByLabelText(/établissement/i), 'CHU Test');
        await user.selectOptions(screen.getByLabelText(/rôle/i), 'direction');
        await user.type(screen.getByLabelText(/message/i), 'Demande de démo.');
        await user.type(screen.getByLabelText(/anti-spam/i), '7');
        await user.click(screen.getByLabelText(/j'accepte/i));
        await user.click(screen.getByRole('button', { name: /envoyer la demande/i }));

        expect(await screen.findByText(/adresse email professionnelle/i)).toBeTruthy();
        expect(mockedSubmitDemoRequest).not.toHaveBeenCalled();
    });

    it('shows an API error without clearing the form', async () => {
        mockedSubmitDemoRequest.mockRejectedValueOnce({
            response: { data: { message: 'Canal de contact indisponible' } },
        });
        const user = await fillValidForm();

        await user.click(screen.getByRole('button', { name: /envoyer la demande/i }));

        expect(await screen.findByText('Canal de contact indisponible')).toBeTruthy();
        expect(screen.getByDisplayValue('Camille Martin')).toBeTruthy();
    });
});
