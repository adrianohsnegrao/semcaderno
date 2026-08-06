import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const directory = resolve(import.meta.dirname, 'database/migrations');
const filenamePattern = /^\d{14}-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/;
const entries = readdirSync(directory)
  .filter((entry) => !entry.startsWith('.'))
  .sort();
const errors = [];

if (entries.length === 0) {
  errors.push('At least one ordered TypeScript migration is required.');
}

for (const entry of entries) {
  if (!filenamePattern.test(entry)) {
    errors.push(`Invalid migration filename: ${entry}`);
  }
  const content = readFileSync(resolve(directory, entry));
  const checksum = createHash('sha256').update(content).digest('hex');
  if (checksum.length !== 64) {
    errors.push(`Unable to calculate migration checksum: ${entry}`);
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(
    `Migration sources verified: ${entries.length} ordered TypeScript files with SHA-256 checksums.`,
  );
}
