import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { runSeed } from '../src/modules/seed/seed.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const printSummary = (summary) => {
  console.log('Seed summary');
  console.log(`Status: ${summary.success ? 'completed successfully' : 'failed'}`);
  console.log(
    `Authors: processed=${summary.authors.processed}, created=${summary.authors.created}, updated=${summary.authors.updated}`,
  );
  console.log(
    `Books: processed=${summary.books.processed}, created=${summary.books.created}, updated=${summary.books.updated}`,
  );
  console.log(
    `Administrator: created=${summary.admin.created}, existing_preserved=${summary.admin.skipped}`,
  );

  if (summary.verification) {
    console.log(
      `Verification: authors=${summary.verification.importedAuthorCount}, books=${summary.verification.importedBookCount}, valid=${summary.verification.valid}`,
    );
  }

  if (summary.warnings.length > 0) {
    console.log('Warnings:');
    summary.warnings.forEach((warning) => {
      console.log(`- [${warning.type}] ${warning.authorId || ''} ${warning.message || ''}`.trim());
    });
  }

  if (summary.errors.length > 0) {
    console.log('Errors:');
    summary.errors.forEach((entry) => {
      console.log(`- [${entry.type}] ${entry.message || entry.bookId || entry.authorId || ''}`.trim());
    });
  }
};

const run = async () => {
  const summary = await runSeed();
  printSummary(summary);
};

run().catch((error) => {
  if (error.seedSummary) {
    printSummary(error.seedSummary);
  }

  console.error(error.message);
  process.exit(1);
});
