import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import AiKnowledgeBaseReferences from './AiKnowledgeBaseReferences.jsx';

describe('AiKnowledgeBaseReferences', () => {
  it('renders known reference titles from returned IDs only', () => {
    render(<AiKnowledgeBaseReferences referenceIds={['royalty-payout', 'communication-tone']} />);

    expect(screen.getByText('Royalty and Payout Policy')).toBeInTheDocument();
    expect(screen.getByText('Communication Tone Guidelines')).toBeInTheDocument();
    expect(screen.getByText('ID: royalty-payout')).toBeInTheDocument();
  });

  it('handles unknown references safely', () => {
    render(<AiKnowledgeBaseReferences referenceIds={['unknown-policy-id']} />);

    expect(screen.getByText('Unknown reference')).toBeInTheDocument();
    expect(screen.getByText(/not in the known title map/i)).toBeInTheDocument();
  });

  it('shows empty state when no references returned', () => {
    render(<AiKnowledgeBaseReferences referenceIds={[]} />);
    expect(screen.getByText(/no knowledge-base references were returned/i)).toBeInTheDocument();
  });
});
