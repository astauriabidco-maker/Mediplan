import { beforeEach, describe, expect, it, vi } from 'vitest';

const axiosMock = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock('./axios', () => ({
  default: axiosMock,
}));

import {
  DEMO_REQUEST_API_CONTRACT,
  DEMO_REQUEST_ENDPOINT,
  DemoRequestValidationError,
  submitDemoRequest,
  validateDemoRequest,
  type DemoRequestInput,
} from './demo-request.api';

const validDemoRequest: DemoRequestInput = {
  organizationName: 'Centre Hospitalier Saint Claire',
  organizationType: 'HOSPITAL',
  staffRange: '500_999',
  country: 'FR',
  contactFirstName: 'Nadia',
  contactLastName: 'Martin',
  jobTitle: 'Directrice des operations',
  workEmail: 'nadia.martin@ch-saintclaire.fr',
  phone: '+33102030405',
  message: 'Nous souhaitons organiser une demonstration commerciale.',
  consentToBeContacted: true,
};

describe('demo request API contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defines the candidate lead endpoint contract', () => {
    expect(DEMO_REQUEST_API_CONTRACT).toEqual(
      expect.objectContaining({
        surface: 'lead',
        method: 'POST',
        path: DEMO_REQUEST_ENDPOINT,
        candidate: true,
      }),
    );
    expect(DEMO_REQUEST_API_CONTRACT.requestKeys).toEqual([
      'organizationName',
      'organizationType',
      'staffRange',
      'country',
      'contactFirstName',
      'contactLastName',
      'jobTitle',
      'workEmail',
      'consentToBeContacted',
      'phone',
      'message',
    ]);
    expect(DEMO_REQUEST_API_CONTRACT.responseKeys).toEqual([
      'id',
      'status',
      'submittedAt',
    ]);
    expect(DEMO_REQUEST_API_CONTRACT.recoverableErrors).toContain(422);
  });

  it('accepts a complete professional lead request', () => {
    expect(validateDemoRequest(validDemoRequest)).toEqual([]);
  });

  it('rejects missing required fields', () => {
    const issues = validateDemoRequest({
      ...validDemoRequest,
      organizationName: '',
      contactLastName: '   ',
      jobTitle: undefined,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'organizationName',
          code: 'required',
        }),
        expect.objectContaining({
          field: 'contactLastName',
          code: 'required',
        }),
        expect.objectContaining({
          field: 'jobTitle',
          code: 'required',
        }),
      ]),
    );
  });

  it('rejects non-professional or malformed email addresses', () => {
    expect(
      validateDemoRequest({
        ...validDemoRequest,
        workEmail: 'nadia@gmail.com',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'workEmail',
          code: 'non_professional_email',
        }),
      ]),
    );

    expect(
      validateDemoRequest({
        ...validDemoRequest,
        workEmail: 'not-an-email',
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'workEmail',
          code: 'invalid_email',
        }),
      ]),
    );
  });

  it('requires explicit commercial contact consent', () => {
    const issues = validateDemoRequest({
      ...validDemoRequest,
      consentToBeContacted: false,
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'consentToBeContacted',
          code: 'missing_consent',
        }),
      ]),
    );
  });

  it('rejects patient, beneficiary or HR data in the lead payload', () => {
    const issues = validateDemoRequest({
      ...validDemoRequest,
      message:
        'Exemple a ne pas envoyer: patient Dupont, NIR 1840575123456, IBAN FR7612345678901234567890123.',
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'message',
          code: 'patient_or_hr_data',
        }),
      ]),
    );
  });

  it('rejects unknown patient or HR fields before posting', async () => {
    const unsafePayload = {
      ...validDemoRequest,
      patientName: 'Jean Dupont',
      employeeMatricule: 'A-42',
    };

    await expect(
      submitDemoRequest(unsafePayload as DemoRequestInput),
    ).rejects.toBeInstanceOf(DemoRequestValidationError);
    expect(validateDemoRequest(unsafePayload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'patientName',
          code: 'unknown_field',
        }),
        expect.objectContaining({
          field: 'employeeMatricule',
          code: 'unknown_field',
        }),
      ]),
    );
    expect(axiosMock.post).not.toHaveBeenCalled();
  });

  it('posts the validated request to the candidate endpoint', async () => {
    axiosMock.post.mockResolvedValue({
      data: {
        id: 'lead_123',
        status: 'RECEIVED',
        submittedAt: '2026-05-10T08:00:00.000Z',
      },
    });

    await expect(submitDemoRequest(validDemoRequest)).resolves.toEqual({
      id: 'lead_123',
      status: 'RECEIVED',
      submittedAt: '2026-05-10T08:00:00.000Z',
    });
    expect(axiosMock.post).toHaveBeenCalledWith(
      DEMO_REQUEST_ENDPOINT,
      validDemoRequest,
    );
  });
});
