import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const expected = {
  node: 'v24.19.0',
  corepack: '0.35.0',
  pnpm: '11.20.0',
};

const packageManifest = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
);
const actual = {
  node: process.version,
  corepack: execFileSync('corepack', ['--version'], { encoding: 'utf8' }).trim(),
  pnpm: execFileSync('pnpm', ['--version'], { encoding: 'utf8' }).trim(),
};

const failures = Object.entries(expected).filter(([name, version]) => actual[name] !== version);
if (packageManifest.packageManager !== `pnpm@${expected.pnpm}`) {
  failures.push(['packageManager', packageManifest.packageManager]);
}

if (failures.length > 0) {
  for (const [name, value] of failures) {
    console.error(`${name} does not match the approved runtime baseline: ${value}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Runtime baseline verified: Node ${actual.node}, Corepack ${actual.corepack}, pnpm ${actual.pnpm}.`,
  );
}
