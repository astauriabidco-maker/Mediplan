import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  productionReadinessApi,
  ProductionDecision,
  ProductionSignoff,
} from '../api/production-readiness.api';
import { renderWithQueryClient } from '../test/render';
import { ReleaseReadinessPage } from './ReleaseReadinessPage';

vi.mock('../api/production-readiness.api', async () => {
  const actual = await vi.importActual<typeof import('../api/production-readiness.api')>(
    '../api/production-readiness.api',
  );

  return {
    ...actual,
    productionReadinessApi: {
      decision: vi.fn(),
      signoffs: vi.fn(),
      updateSignoff: vi.fn(),
      getDecision: vi.fn(),
      getSignoffs: vi.fn(),
      upsertSignoff: vi.fn(),
    },
  };
});

const required = ['HR', 'SECURITY', 'OPERATIONS', 'TECHNICAL', 'DIRECTION'] as const;

const signoff = (
  key: (typeof required)[number],
  overrides?: Partial<ProductionSignoff>,
): ProductionSignoff => ({
  id: required.indexOf(key) + 1,
  tenantId: 'tenant-a',
  key,
  status: 'GO',
  signerName: `${key} signer`,
  signerRole: 'Responsable',
  proofUrl: `https://evidence.example.test/${key.toLowerCase()}`,
  proofLabel: `Preuve ${key}`,
  comment: null,
  signedById: 42,
  signedAt: '2026-05-05T08:00:00.000Z',
  ...overrides,
});

const buildDecision = (
  overrides?: Partial<ProductionDecision>,
): ProductionDecision => ({
  tenantId: 'tenant-a',
  generatedAt: '2026-05-05T08:30:00.000Z',
  status: 'PROD_NO_GO',
  blockers: ['Missing SECURITY signoff', 'SMOKE gate is UNKNOWN'],
  signoffs: [signoff('HR'), signoff('OPERATIONS')],
  signoffSummary: {
    required: [...required],
    missing: ['SECURITY', 'TECHNICAL', 'DIRECTION'],
    pending: [],
    noGo: [],
    proofMissing: [],
  },
  gates: {
    freeze: {
      key: 'FREEZE',
      status: 'PASSED',
      source: 'PROD_FREEZE_STATUS',
    },
    checks: [
      {
        key: 'SMOKE',
        status: 'UNKNOWN',
        source: 'PROD_GATE_SMOKE',
      },
    ],
  },
  ...overrides,
});

const mockGetDecision = vi.mocked(productionReadinessApi.getDecision);
const mockUpsertSignoff = vi.mocked(productionReadinessApi.upsertSignoff);

const renderPage = (decision = buildDecision()) => {
  mockGetDecision.mockResolvedValue(decision);
  mockUpsertSignoff.mockResolvedValue(signoff('SECURITY'));

  return renderWithQueryClient(<ReleaseReadinessPage />);
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('ReleaseReadinessPage', () => {
  it('affiche une décision bloquée avec les raisons bloquantes', async () => {
    renderPage();

    expect(await screen.findByText('Blockers')).toBeInTheDocument();
    expect(screen.getByText('PROD_NO_GO')).toBeInTheDocument();
    expect(screen.getByText('Missing SECURITY signoff')).toBeInTheDocument();
    expect(screen.getByText('SMOKE gate is UNKNOWN')).toBeInTheDocument();
  });

  it('exige une preuve URL avant de soumettre un signoff GO', async () => {
    const user = userEvent.setup();
    renderPage();

    const securityForm = await screen.findByRole('form', { name: 'Signoff SECURITY' });
    await user.selectOptions(within(securityForm).getByLabelText(/décision/i), 'GO');
    await user.type(within(securityForm).getByLabelText(/signataire/i), 'Alice Martin');
    await user.click(
      within(securityForm).getByRole('button', { name: /enregistrer le signoff/i }),
    );

    expect(await within(securityForm).findByRole('alert')).toHaveTextContent(
      'Une preuve URL est obligatoire pour un GO.',
    );
    expect(mockUpsertSignoff).not.toHaveBeenCalled();
  });

  it('appelle la mutation de signoff avec la preuve quand le formulaire est valide', async () => {
    const user = userEvent.setup();
    renderPage();

    const securityForm = await screen.findByRole('form', { name: 'Signoff SECURITY' });
    await user.selectOptions(within(securityForm).getByLabelText(/décision/i), 'GO');
    await user.type(within(securityForm).getByLabelText(/signataire/i), 'Alice Martin');
    await user.type(within(securityForm).getByLabelText(/rôle/i), 'RSSI');
    await user.type(
      within(securityForm).getByLabelText(/preuve URL/i),
      'https://evidence.example.test/security',
    );
    await user.click(
      within(securityForm).getByRole('button', { name: /enregistrer le signoff/i }),
    );

    await waitFor(() => expect(mockUpsertSignoff).toHaveBeenCalledTimes(1));
    expect(mockUpsertSignoff).toHaveBeenCalledWith('SECURITY', {
      status: 'GO',
      signerName: 'Alice Martin',
      signerRole: 'RSSI',
      proofUrl: 'https://evidence.example.test/security',
    });
  });

  it('affiche PROD_READY quand tous les signoffs et gates sont validés', async () => {
    renderPage(
      buildDecision({
        status: 'PROD_READY',
        blockers: [],
        signoffs: required.map((key) => signoff(key)),
        signoffSummary: {
          required: [...required],
          missing: [],
          pending: [],
          noGo: [],
          proofMissing: [],
        },
        gates: {
          freeze: {
            key: 'FREEZE',
            status: 'PASSED',
            source: 'PROD_FREEZE_STATUS',
          },
          checks: [
            {
              key: 'SMOKE',
              status: 'PASSED',
              source: 'PROD_GATE_SMOKE',
            },
          ],
        },
      }),
    );

    expect(await screen.findAllByText('PROD_READY')).toHaveLength(2);
    expect(
      screen.queryByText('Blockers'),
    ).not.toBeInTheDocument();
  });
});
