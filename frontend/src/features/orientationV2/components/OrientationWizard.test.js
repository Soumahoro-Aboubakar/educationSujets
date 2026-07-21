import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OrientationWizard from './OrientationWizard';

describe('OrientationWizard profile selection', () => {
  it('offers the three student profiles with dynamic follow-up fields', async () => {
    const user = userEvent.setup();
    render(<OrientationWizard />);

    const autoButton = screen.getByRole('button', { name: /je ne sais pas encore où m/i });
    const fieldButton = screen.getByRole('button', { name: /je connais la filière que je veux faire/i });
    const schoolButton = screen.getByRole('button', { name: /je connais l’école et la filière que je veux faire/i });

    expect(autoButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.queryByLabelText(/filière/i)).toBeNull();

    await user.click(fieldButton);
    expect(fieldButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText(/filière/i)).toBeInTheDocument();

    await user.click(schoolButton);
    expect(schoolButton.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText(/école/i)).toBeInTheDocument();
  });
});
