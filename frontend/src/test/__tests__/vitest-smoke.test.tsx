import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

function SmokeButton() {
  return (
    <button type="button" onClick={(event) => {
      event.currentTarget.textContent = 'Tests UI actifs';
    }}>
      Lancer
    </button>
  );
}

describe('vitest ui smoke', () => {
  it('renders React components and handles user events in jsdom', async () => {
    const user = userEvent.setup();

    render(<SmokeButton />);
    await user.click(screen.getByRole('button', { name: 'Lancer' }));

    expect(screen.getByRole('button', { name: 'Tests UI actifs' })).toBeInTheDocument();
  });
});
