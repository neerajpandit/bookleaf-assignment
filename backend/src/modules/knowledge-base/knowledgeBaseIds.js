export const KNOWLEDGE_BASE_IDS = [
  'royalty-payout',
  'isbn-metadata',
  'printing-quality',
  'distribution-availability',
  'book-production',
  'communication-tone',
];

export const isValidKnowledgeBaseId = (referenceId) =>
  KNOWLEDGE_BASE_IDS.includes(referenceId);

export default KNOWLEDGE_BASE_IDS;
