import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const collectMarkdown = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectMarkdown(path);
    return entry.name.endsWith('.md') ? [path] : [];
  });

const errors = [];
let linkCount = 0;
let tableCount = 0;
const markdownFiles = collectMarkdown(root);

for (const file of markdownFiles) {
  const content = readFileSync(file, 'utf8');
  if (!content.endsWith('\n')) errors.push(`${file}: missing final newline`);
  const lines = content.split('\n');

  for (const [index, line] of lines.entries()) {
    if (line.trimEnd() !== line) errors.push(`${file}:${index + 1}: trailing whitespace`);
    for (const match of line.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1];
      if (!target || /^(?:https?:|mailto:|#)/.test(target)) continue;
      const localTarget = target.split('#', 1)[0];
      if (!localTarget) continue;
      linkCount += 1;
      const targetPath = resolve(dirname(file), localTarget);
      try {
        if (!statSync(targetPath).isFile() && !statSync(targetPath).isDirectory()) {
          errors.push(`${file}:${index + 1}: unresolved link ${target}`);
        }
      } catch {
        errors.push(`${file}:${index + 1}: unresolved link ${target}`);
      }
    }
  }

  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].startsWith('| ')) continue;
    const start = index;
    const pipeCounts = [];
    while (index < lines.length && lines[index].startsWith('| ')) {
      pipeCounts.push(lines[index].split('|').length);
      index += 1;
    }
    if (pipeCounts.length >= 2) {
      tableCount += 1;
      if (new Set(pipeCounts).size !== 1) {
        errors.push(`${file}:${start + 1}: inconsistent Markdown table shape`);
      }
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log(
    `Documentation verified: ${markdownFiles.length} Markdown files, ${linkCount} local links, ${tableCount} tables.`,
  );
}
