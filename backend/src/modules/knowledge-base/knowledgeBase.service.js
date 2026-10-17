import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { KNOWLEDGE_BASE_IDS } from './knowledgeBaseIds.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONTENT_DIR = path.resolve(__dirname, 'content');

const TITLE_BY_ID = {
  'royalty-payout': 'Royalty and Payout Policy',
  'isbn-metadata': 'ISBN and Metadata Policy',
  'printing-quality': 'Printing and Quality Policy',
  'distribution-availability': 'Distribution and Availability Policy',
  'book-production': 'Book Production Policy',
  'communication-tone': 'Communication Tone Guidelines',
};

const KEYWORD_HINTS = {
  'royalty-payout': ['royalty', 'payout', 'payment', 'paid', 'pending', 'revenue'],
  'isbn-metadata': ['isbn', 'metadata', 'title', 'cover text', 'listing'],
  'printing-quality': ['print', 'quality', 'binding', 'misprint', 'defect'],
  'distribution-availability': ['distribution', 'availability', 'amazon', 'flipkart', 'store'],
  'book-production': ['production', 'typesetting', 'cover design', 'publication date', 'in production'],
  'communication-tone': ['tone', 'response', 'communication'],
};

let cachedDocuments = null;

const loadDocuments = async () => {
  if (cachedDocuments) {
    return cachedDocuments;
  }

  const documents = await Promise.all(
    KNOWLEDGE_BASE_IDS.map(async (id) => {
      const filePath = path.join(CONTENT_DIR, `${id}.md`);
      const body = await fs.readFile(filePath, 'utf8');
      const lines = body.split('\n').filter(Boolean);
      const title = lines[0]?.replace(/^#\s*/, '') || TITLE_BY_ID[id];

      return {
        id,
        title,
        body: lines.slice(1).join('\n').trim(),
      };
    }),
  );

  cachedDocuments = documents;
  return documents;
};

const scoreDocument = (document, searchText) => {
  const hints = KEYWORD_HINTS[document.id] || [];
  return hints.reduce(
    (score, keyword) => (searchText.includes(keyword.toLowerCase()) ? score + 1 : score),
    0,
  );
};

export const getRelevantKnowledgeBase = async ({ ticket, conversation = [] }) => {
  const documents = await loadDocuments();
  const searchText = [
    ticket.subject,
    ticket.description,
    ...conversation.map((message) => message.body),
  ]
    .join(' ')
    .toLowerCase();

  const ranked = documents
    .map((document) => ({
      ...document,
      score: scoreDocument(document, searchText),
    }))
    .sort((left, right) => right.score - left.score);

  const selected = ranked.some((entry) => entry.score > 0)
    ? ranked.filter((entry) => entry.score > 0).slice(0, 4)
    : ranked.slice(0, 3);

  selected.push(documents.find((entry) => entry.id === 'communication-tone'));

  const unique = [...new Map(selected.map((entry) => [entry.id, entry])).values()];

  return unique.map(({ id, title, body }) => ({ id, title, body }));
};

export const resetKnowledgeBaseCache = () => {
  cachedDocuments = null;
};

export default {
  getRelevantKnowledgeBase,
  resetKnowledgeBaseCache,
};
