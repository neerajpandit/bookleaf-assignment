/**
 * Human-readable titles for knowledge-base reference IDs.
 * Mirrors backend knowledgeBase.service.js TITLE_BY_ID mapping.
 * The API returns identifiers only; excerpts are not exposed via a frontend endpoint.
 */
export const KNOWLEDGE_BASE_TITLES = {
  'royalty-payout': 'Royalty and Payout Policy',
  'isbn-metadata': 'ISBN and Metadata Policy',
  'printing-quality': 'Printing and Quality Policy',
  'distribution-availability': 'Distribution and Availability Policy',
  'book-production': 'Book Production Policy',
  'communication-tone': 'Communication Tone Guidelines',
};

export const getKnowledgeBaseTitle = (referenceId) =>
  KNOWLEDGE_BASE_TITLES[referenceId] || null;

export default KNOWLEDGE_BASE_TITLES;
