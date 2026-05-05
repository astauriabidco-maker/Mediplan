import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  productionReadinessApi,
  ProductionDecision,
  ProductionSignoffHistory,
  ProductionSignoff,
} from '../api/production-readiness.api';
import { renderWithQueryClient } from '../test/render';
import { ReleaseReadinessPage } from './ReleaseReadinessPage';

vi.mock('../api/production-readiness.api', async () => {
  const actual = await vi.importActual<
    typeof import('../api/production-readiness.api')
  >('../api/production-readiness.api');

  return {
    ...actual,
    productionReadinessApi: {
      decision: vi.fn(),
      signoffs: vi.fn(),
      updateSignoff: vi.fn(),
      getDecision: vi.fn(),
      getSignoffs: vi.fn(),
      upsertSignoff: vi.fn(),
      getSignoffHistory: vi.fn(),
      upsertGate: vi.fn(),
    },
  };
});

const required = [
  'HR',
  'SECURITY',
  'OPERATIONS',
  'TECHNICAL',
  'DIRECTION',
] as const;

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

const buildHistory = (
  overrides?: Partial<ProductionSignoffHistory>,
): ProductionSignoffHistory => ({
  tenantId: 'tenant-a',
  generatedAt: '2026-05-05T08:45:00.000Z',
  decision: buildDecision(),
  entries: [
    {
      auditLogId: 31,
      chainSequence: 12,
      eventHash: 'hash-security-go',
      key: 'SECURITY',
      action: 'CREATE_PRODUCTION_SIGNOFF',
      decidedAt: '2026-05-05T08:40:00.000Z',
      actorId: 42,
      actorName: 'Alice Martin',
      status: 'GO',
      signerName: 'Alice Martin',
      signerRole: 'RSSI',
      signedById: 42,
      signedAt: '2026-05-05T08:40:00.000Z',
      proofUrl: 'https://evidence.example.test/security',
      proofLabel: 'Audit sécurité',
      comment: 'Validation sécurité OK',
    },
  ],
  byRole: {
    HR: [],
    SECURITY: [],
    OPERATIONS: [],
    TECHNICAL: [],
    DIRECTION: [],
  },
  ...overrides,
});

const mockGetDecision = vi.mocked(productionReadinessApi.getDecision);
const mockUpsertSignoff = vi.mocked(productionReadinessApi.upsertSignoff);
const mockGetSignoffHistory = vi.mocked(
  productionReadinessApi.getSignoffHistory,
);
const mockUpsertGate = vi.mocked(productionReadinessApi.upsertGate);

const renderPage = (decision = buildDecision()) => {
  mockGetDecision.mockResolvedValue(decision);
  mockUpsertSignoff.mockResolvedValue(signoff('SECURITY'));
  mockGetSignoffHistory.mockResolvedValue(buildHistory({ decision }));
  mockUpsertGate.mockResolvedValue({
    key: 'SMOKE',
    status: 'PASSED',
    source: 'manual',
    evidenceUrl: 'https://evidence.example.test/smoke',
    checkedAt: '2026-05-05T09:00:00.000Z',
  });

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

    const securityForm = await screen.findByRole('form', {
      name: 'Signoff SECURITY',
    });
    await user.selectOptions(
      within(securityForm).getByLabelText(/décision/i),
      'GO',
    );
    await user.type(
      within(securityForm).getByLabelText(/signataire/i),
      'Alice Martin',
    );
    await user.click(
      within(securityForm).getByRole('button', {
        name: /enregistrer le signoff/i,
      }),
    );

    expect(await within(securityForm).findByRole('alert')).toHaveTextContent(
      'Une preuve URL est obligatoire pour un GO.',
    );
    expect(mockUpsertSignoff).not.toHaveBeenCalled();
  });

  it('signale la complétude, les preuves manquantes et les preuves non consultables', async () => {
    renderPage(
      buildDecision({
        signoffs: [
          signoff('HR', { comment: 'PV de recette validé' }),
          signoff('SECURITY', {
            proofUrl: 'ftp://evidence.example.test/security',
            proofLabel: 'Audit sécurité',
          }),
          signoff('OPERATIONS', { proofUrl: null, proofLabel: null }),
        ],
        signoffSummary: {
          required: [...required],
          missing: ['TECHNICAL', 'DIRECTION'],
          pending: [],
          noGo: [],
          proofMissing: ['OPERATIONS'],
        },
      }),
    );

    const hrForm = await screen.findByRole('form', { name: 'Signoff HR' });
    const hrCompleteness = within(hrForm).getByLabelText('Complétude HR');
    expect(hrCompleteness).toHaveTextContent(
      'GO signé avec preuve consultable',
    );
    expect(
      within(hrForm).getByRole('link', { name: /preuve HR/i }),
    ).toHaveAttribute('href', 'https://evidence.example.test/hr');
    expect(hrCompleteness).toHaveTextContent('PV de recette validé');

    const securityForm = screen.getByRole('form', { name: 'Signoff SECURITY' });
    expect(
      within(securityForm).getByLabelText('Complétude SECURITY'),
    ).toHaveTextContent('Preuve non consultable');
    expect(
      within(securityForm).queryByRole('link', { name: /audit sécurité/i }),
    ).not.toBeInTheDocument();

    const operationsForm = screen.getByRole('form', {
      name: 'Signoff OPERATIONS',
    });
    expect(
      within(operationsForm).getByLabelText('Complétude OPERATIONS'),
    ).toHaveTextContent('Preuve manquante');
  });

  it('refuse une preuve non consultable avant de soumettre', async () => {
    const user = userEvent.setup();
    renderPage();

    const securityForm = await screen.findByRole('form', {
      name: 'Signoff SECURITY',
    });
    await user.selectOptions(
      within(securityForm).getByLabelText(/décision/i),
      'GO',
    );
    await user.type(
      within(securityForm).getByLabelText(/signataire/i),
      'Alice Martin',
    );
    await user.type(
      within(securityForm).getByLabelText(/preuve URL/i),
      'ftp://evidence',
    );
    await user.click(
      within(securityForm).getByRole('button', {
        name: /enregistrer le signoff/i,
      }),
    );

    expect(await within(securityForm).findByRole('alert')).toHaveTextContent(
      'La preuve doit être une URL http(s) consultable.',
    );
    expect(mockUpsertSignoff).not.toHaveBeenCalled();
  });

  it('appelle la mutation de signoff avec la preuve quand le formulaire est valide', async () => {
    const user = userEvent.setup();
    renderPage();

    const securityForm = await screen.findByRole('form', {
      name: 'Signoff SECURITY',
    });
    await user.selectOptions(
      within(securityForm).getByLabelText(/décision/i),
      'GO',
    );
    await user.type(
      within(securityForm).getByLabelText(/signataire/i),
      'Alice Martin',
    );
    await user.type(within(securityForm).getByLabelText(/rôle/i), 'RSSI');
    await user.type(
      within(securityForm).getByLabelText(/preuve URL/i),
      'https://evidence.example.test/security',
    );
    await user.click(
      within(securityForm).getByRole('button', {
        name: /enregistrer le signoff/i,
      }),
    );

    await waitFor(() => expect(mockUpsertSignoff).toHaveBeenCalledTimes(1));
    expect(mockUpsertSignoff).toHaveBeenCalledWith('SECURITY', {
      status: 'GO',
      signerName: 'Alice Martin',
      signerRole: 'RSSI',
      proofUrl: 'https://evidence.example.test/security',
    });
  });

  it('permet de valider un gate avec une preuve applicative', async () => {
    const user = userEvent.setup();
    renderPage();

    const smokeForm = await screen.findByRole('form', { name: 'Gate SMOKE' });
    await user.selectOptions(
      within(smokeForm).getByLabelText(/statut/i),
      'PASSED',
    );
    await user.clear(within(smokeForm).getByLabelText(/source/i));
    await user.type(within(smokeForm).getByLabelText(/source/i), 'smoke-tests');
    await user.type(
      within(smokeForm).getByLabelText(/preuve URL/i),
      'https://evidence.example.test/smoke',
    );
    await user.click(
      within(smokeForm).getByRole('button', { name: /enregistrer le gate/i }),
    );

    await waitFor(() => expect(mockUpsertGate).toHaveBeenCalledTimes(1));
    expect(mockUpsertGate).toHaveBeenCalledWith('SMOKE', {
      status: 'PASSED',
      source: 'smoke-tests',
      evidenceUrl: 'https://evidence.example.test/smoke',
    });
  });

  it('affiche l’historique audit des signoffs', async () => {
    renderPage();

    expect(await screen.findByText('Historique audit')).toBeInTheDocument();
    expect(screen.getByText('Sécurité: GO')).toBeInTheDocument();
    expect(screen.getByText(/Acteur: Alice Martin/)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /audit sécurité/i }),
    ).toHaveAttribute('href', 'https://evidence.example.test/security');
  });

  it('rafraîchit la décision vers PROD_READY après validation du signoff manquant', async () => {
    const user = userEvent.setup();
    mockGetDecision
      .mockResolvedValueOnce(buildDecision())
      .mockResolvedValueOnce(
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
                key: 'MIGRATION',
                status: 'PASSED',
                source: 'PROD_GATE_MIGRATION',
              },
              {
                key: 'SEED',
                status: 'PASSED',
                source: 'PROD_GATE_SEED',
              },
              {
                key: 'SMOKE',
                status: 'PASSED',
                source: 'PROD_GATE_SMOKE',
              },
              {
                key: 'COMPLIANCE',
                status: 'PASSED',
                source: 'PROD_GATE_COMPLIANCE',
              },
              {
                key: 'AUDIT',
                status: 'PASSED',
                source: 'PROD_GATE_AUDIT',
              },
              {
                key: 'BACKUP',
                status: 'PASSED',
                source: 'PROD_GATE_BACKUP',
              },
            ],
          },
        }),
      );
    mockUpsertSignoff.mockResolvedValue(signoff('SECURITY'));

    renderWithQueryClient(<ReleaseReadinessPage />);

    expect(await screen.findByText('PROD_NO_GO')).toBeInTheDocument();
    expect(screen.getByText('Missing SECURITY signoff')).toBeInTheDocument();

    const securityForm = await screen.findByRole('form', {
      name: 'Signoff SECURITY',
    });
    await user.selectOptions(
      within(securityForm).getByLabelText(/décision/i),
      'GO',
    );
    await user.type(
      within(securityForm).getByLabelText(/signataire/i),
      'Alice Martin',
    );
    await user.type(within(securityForm).getByLabelText(/rôle/i), 'RSSI');
    await user.type(
      within(securityForm).getByLabelText(/preuve URL/i),
      'https://evidence.example.test/security',
    );
    await user.click(
      within(securityForm).getByRole('button', {
        name: /enregistrer le signoff/i,
      }),
    );

    await waitFor(() => expect(mockUpsertSignoff).toHaveBeenCalledTimes(1));
    expect(await screen.findAllByText('PROD_READY')).toHaveLength(2);
    expect(
      screen.queryByText('Missing SECURITY signoff'),
    ).not.toBeInTheDocument();
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
    expect(screen.queryByText('Blockers')).not.toBeInTheDocument();
  });
});
