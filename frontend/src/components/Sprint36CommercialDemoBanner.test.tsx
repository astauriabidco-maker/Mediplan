import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithQueryClient } from '../test/render';
import { Sprint36CommercialDemoBanner } from './Sprint36CommercialDemoBanner';
import { SPRINT36_COMMERCIAL_DEMO_TENANT_ID } from '../lib/sprint36CommercialDemo';

describe('Sprint36CommercialDemoBanner', () => {
  it('renders the fictional data warning for the separated demo tenant', () => {
    renderWithQueryClient(
      <Sprint36CommercialDemoBanner
        tenantId={SPRINT36_COMMERCIAL_DEMO_TENANT_ID}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      SPRINT36_COMMERCIAL_DEMO_TENANT_ID,
    );
    expect(screen.getByText(/donnees fictives/i)).toBeInTheDocument();
    expect(screen.getByText(/tenant separe/i)).toBeInTheDocument();
  });

  it('stays hidden outside commercial demo mode', () => {
    const { container } = renderWithQueryClient(
      <Sprint36CommercialDemoBanner tenantId="tenant-a" />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
