import api from './axios';

export type DemoRequestOrganizationType =
  | 'HOSPITAL'
  | 'CLINIC'
  | 'EHPAD'
  | 'HOME_CARE'
  | 'HEALTH_NETWORK'
  | 'OTHER';

export type DemoRequestStaffRange =
  | '1_49'
  | '50_199'
  | '200_499'
  | '500_999'
  | '1000_PLUS';

export interface DemoRequestInput {
  organizationName: string;
  organizationType: DemoRequestOrganizationType;
  staffRange: DemoRequestStaffRange;
  country: string;
  contactFirstName: string;
  contactLastName: string;
  jobTitle: string;
  workEmail: string;
  phone?: string;
  message?: string;
  consentToBeContacted: true;
}

export interface DemoRequestResponse {
  id: string;
  status: 'RECEIVED' | 'QUALIFIED' | 'REJECTED';
  submittedAt: string;
}

export type DemoRequestValidationIssueCode =
  | 'required'
  | 'invalid_enum'
  | 'invalid_email'
  | 'non_professional_email'
  | 'missing_consent'
  | 'patient_or_hr_data'
  | 'unknown_field';

export interface DemoRequestValidationIssue {
  field: string;
  code: DemoRequestValidationIssueCode;
  message: string;
}

export interface DemoRequestEndpointContract {
  surface: 'lead';
  label: string;
  method: 'POST';
  path: string;
  candidate: true;
  requestKeys: readonly (keyof DemoRequestInput)[];
  responseKeys: readonly (keyof DemoRequestResponse)[];
  recoverableErrors: ReadonlyArray<400 | 401 | 403 | 409 | 422>;
}

export const DEMO_REQUEST_ENDPOINT = '/api/demo-requests';

export const DEMO_REQUEST_REQUIRED_FIELDS = [
  'organizationName',
  'organizationType',
  'staffRange',
  'country',
  'contactFirstName',
  'contactLastName',
  'jobTitle',
  'workEmail',
  'consentToBeContacted',
] as const satisfies readonly (keyof DemoRequestInput)[];

export const DEMO_REQUEST_OPTIONAL_FIELDS = [
  'phone',
  'message',
] as const satisfies readonly (keyof DemoRequestInput)[];

export const DEMO_REQUEST_ALLOWED_FIELDS = [
  ...DEMO_REQUEST_REQUIRED_FIELDS,
  ...DEMO_REQUEST_OPTIONAL_FIELDS,
] as const satisfies readonly (keyof DemoRequestInput)[];

export const DEMO_REQUEST_ORGANIZATION_TYPES = [
  'HOSPITAL',
  'CLINIC',
  'EHPAD',
  'HOME_CARE',
  'HEALTH_NETWORK',
  'OTHER',
] as const satisfies readonly DemoRequestOrganizationType[];

export const DEMO_REQUEST_STAFF_RANGES = [
  '1_49',
  '50_199',
  '200_499',
  '500_999',
  '1000_PLUS',
] as const satisfies readonly DemoRequestStaffRange[];

export const DEMO_REQUEST_API_CONTRACT = {
  surface: 'lead',
  label: 'Commercial demo lead request',
  method: 'POST',
  path: DEMO_REQUEST_ENDPOINT,
  candidate: true,
  requestKeys: DEMO_REQUEST_ALLOWED_FIELDS,
  responseKeys: ['id', 'status', 'submittedAt'],
  recoverableErrors: [400, 401, 403, 409, 422],
} as const satisfies DemoRequestEndpointContract;

const PERSONAL_EMAIL_DOMAINS = new Set([
  'aol.com',
  'free.fr',
  'gmail.com',
  'hotmail.com',
  'icloud.com',
  'laposte.net',
  'live.com',
  'msn.com',
  'orange.fr',
  'outlook.com',
  'proton.me',
  'protonmail.com',
  'wanadoo.fr',
  'yahoo.com',
  'yahoo.fr',
]);

const PATIENT_OR_HR_DATA_PATTERNS = [
  /\b(patient|patiente|beneficiaire|bénéficiaire|resident|résident)\b/i,
  /\b(agent|salarie|salarié|employe|employé|personnel)\s*[:#-]/i,
  /\b(nir|numero securite sociale|numéro sécurité sociale|ssn|matricule|iban|bic|rib)\b/i,
  /\b(dossier patient|fiche de paie|bulletin de paie|contrat de travail)\b/i,
  /\b\d{13}\b/,
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/i,
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const addIssue = (
  issues: DemoRequestValidationIssue[],
  field: string,
  code: DemoRequestValidationIssueCode,
  message: string,
): void => {
  issues.push({ field, code, message });
};

const hasPatientOrHrData = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  return PATIENT_OR_HR_DATA_PATTERNS.some((pattern) => pattern.test(value));
};

export function validateDemoRequest(
  candidate: unknown,
): DemoRequestValidationIssue[] {
  const issues: DemoRequestValidationIssue[] = [];

  if (!isPlainObject(candidate)) {
    return [
      {
        field: 'request',
        code: 'required',
        message: 'La demande de demo est requise.',
      },
    ];
  }

  const allowedFields = new Set<string>(DEMO_REQUEST_ALLOWED_FIELDS);
  for (const field of Object.keys(candidate)) {
    if (!allowedFields.has(field)) {
      addIssue(
        issues,
        field,
        'unknown_field',
        'Ce champ ne fait pas partie du contrat lead demo.',
      );
    }
  }

  for (const field of DEMO_REQUEST_REQUIRED_FIELDS) {
    const value = candidate[field];
    if (field === 'consentToBeContacted') {
      if (value !== true) {
        addIssue(
          issues,
          field,
          'missing_consent',
          'Le consentement de contact commercial est obligatoire.',
        );
      }
      continue;
    }

    if (!isNonEmptyString(value)) {
      addIssue(issues, field, 'required', 'Ce champ est obligatoire.');
    }
  }

  if (
    isNonEmptyString(candidate.organizationType) &&
    !DEMO_REQUEST_ORGANIZATION_TYPES.includes(
      candidate.organizationType as DemoRequestOrganizationType,
    )
  ) {
    addIssue(
      issues,
      'organizationType',
      'invalid_enum',
      'Le type d etablissement est invalide.',
    );
  }

  if (
    isNonEmptyString(candidate.staffRange) &&
    !DEMO_REQUEST_STAFF_RANGES.includes(
      candidate.staffRange as DemoRequestStaffRange,
    )
  ) {
    addIssue(
      issues,
      'staffRange',
      'invalid_enum',
      'La tranche d effectif est invalide.',
    );
  }

  if (isNonEmptyString(candidate.workEmail)) {
    const email = candidate.workEmail.trim().toLowerCase();
    const emailDomain = email.split('@')[1];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      addIssue(issues, 'workEmail', 'invalid_email', 'L email est invalide.');
    } else if (PERSONAL_EMAIL_DOMAINS.has(emailDomain)) {
      addIssue(
        issues,
        'workEmail',
        'non_professional_email',
        'Un email professionnel est requis pour une demande de demo.',
      );
    }
  }

  for (const field of DEMO_REQUEST_ALLOWED_FIELDS) {
    if (hasPatientOrHrData(candidate[field])) {
      addIssue(
        issues,
        field,
        'patient_or_hr_data',
        'La demande de demo ne doit contenir aucune donnee patient ou RH.',
      );
    }
  }

  return issues;
}

export function assertValidDemoRequest(
  candidate: unknown,
): asserts candidate is DemoRequestInput {
  const issues = validateDemoRequest(candidate);
  if (issues.length > 0) {
    throw new DemoRequestValidationError(issues);
  }
}

export class DemoRequestValidationError extends Error {
  constructor(public readonly issues: DemoRequestValidationIssue[]) {
    super('Invalid demo request');
    this.name = 'DemoRequestValidationError';
  }
}

export const submitDemoRequest = async (
  input: DemoRequestInput,
): Promise<DemoRequestResponse> => {
  assertValidDemoRequest(input);
  const response = await api.post<DemoRequestResponse>(DEMO_REQUEST_ENDPOINT, input);
  return response.data;
};
