import fs from 'fs/promises';
import path from 'path';

const assertUniqueValues = (values, label) => {
  const seen = new Map();
  const duplicates = [];

  values.forEach((value) => {
    const count = (seen.get(value) || 0) + 1;
    seen.set(value, count);

    if (count === 2) {
      duplicates.push(value);
    }
  });

  if (duplicates.length > 0) {
    throw new Error(`Dataset validation error: duplicate ${label} values detected: ${duplicates.join(', ')}`);
  }
};

export const loadDataset = async (datasetPath) => {
  const resolvedPath = path.resolve(datasetPath);
  const raw = await fs.readFile(resolvedPath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed.authors)) {
    throw new Error('Dataset validation error: "authors" must be an array.');
  }

  const authorIds = [];
  const bookIds = [];
  const books = [];

  parsed.authors.forEach((author) => {
    if (!author.author_id) {
      throw new Error('Dataset validation error: author record is missing author_id.');
    }

    authorIds.push(author.author_id);

    if (!Array.isArray(author.books)) {
      throw new Error(`Dataset validation error: author ${author.author_id} is missing a books array.`);
    }

    author.books.forEach((book) => {
      if (!book.book_id) {
        throw new Error(`Dataset validation error: author ${author.author_id} contains a book without book_id.`);
      }

      bookIds.push(book.book_id);
      books.push({ authorId: author.author_id, book });
    });
  });

  assertUniqueValues(authorIds, 'author_id');
  assertUniqueValues(bookIds, 'book_id');

  return {
    authors: parsed.authors,
    books,
    counts: {
      authors: parsed.authors.length,
      books: books.length,
    },
  };
};

export default loadDataset;
