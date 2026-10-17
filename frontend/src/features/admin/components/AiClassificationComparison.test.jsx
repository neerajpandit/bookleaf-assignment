import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AiClassificationComparison from './AiClassificationComparison.jsx';

describe('AiClassificationComparison', () => {
  it('shows policy, AI, and effective values separately', () => {
    render(
      <AiClassificationComparison
        ticket={{
          policyCategory: 'General Inquiry',
          policyPriority: 'LOW',
          policyPriorityRationale: 'Routine profile update.',
          aiCategory: 'ISBN & Metadata Issues',
          aiPriority: 'MEDIUM',
          aiPriorityRationale: 'Metadata change may need review.',
          category: 'General Inquiry',
          priority: 'LOW',
        }}
      />,
    );

    expect(screen.getByText('Policy priority')).toBeInTheDocument();
    expect(screen.getByText('AI suggested priority')).toBeInTheDocument();
    expect(screen.getByText('Effective priority')).toBeInTheDocument();
    expect(screen.getByText('Routine profile update.')).toBeInTheDocument();
    expect(screen.getByText(/AI suggestion differs from the policy assignment/i)).toBeInTheDocument();
  });
});
