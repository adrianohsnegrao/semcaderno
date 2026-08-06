import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const tsFiles = ['**/*.{ts,tsx}'];
const nodeGlobals = globals.node;

const restrictedImports = (patterns) => [
  'error',
  {
    patterns: patterns.map((group) => ({
      group,
      message: 'This import crosses an approved Sem Caderno package boundary.',
    })),
  },
];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.d.ts',
      'pnpm-lock.yaml',
    ],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...js.configs.recommended,
    languageOptions: { globals: nodeGlobals },
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({ ...config, files: tsFiles })),
  {
    files: tsFiles,
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['packages/domain/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        ['@sem-caderno/*'],
        ['fastify', 'next', 'next/*', 'react', 'react/*', 'pg', 'zod'],
        ['node:*'],
      ]),
    },
  },
  {
    files: ['packages/application/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        [
          '@sem-caderno/contracts',
          '@sem-caderno/persistence-postgres',
          '@sem-caderno/server',
          '@sem-caderno/web',
        ],
        ['fastify', 'next', 'next/*', 'react', 'react/*', 'pg', 'zod'],
        ['node:*'],
      ]),
    },
  },
  {
    files: ['packages/contracts/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        ['@sem-caderno/*'],
        ['fastify', 'next', 'next/*', 'react', 'react/*', 'pg'],
        ['node:*'],
      ]),
    },
  },
  {
    files: ['packages/persistence-postgres/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        ['@sem-caderno/contracts', '@sem-caderno/server', '@sem-caderno/web'],
        ['fastify', 'next', 'next/*', 'react', 'react/*'],
      ]),
    },
  },
  {
    files: ['apps/server/src/**/*.{ts,tsx}'],
    languageOptions: { globals: nodeGlobals },
    rules: {
      'no-restricted-imports': restrictedImports([['@sem-caderno/web']]),
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    plugins: {
      '@next/next': nextPlugin,
      'jsx-a11y': jsxA11y,
      'react-hooks': reactHooks,
    },
    languageOptions: { globals: globals.browser },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      ...reactHooks.configs.flat.recommended.rules,
      '@next/next/no-html-link-for-pages': 'off',
      'no-restricted-imports': restrictedImports([
        [
          '@sem-caderno/application',
          '@sem-caderno/domain',
          '@sem-caderno/persistence-postgres',
          '@sem-caderno/server',
          '@sem-caderno/database-migrations',
        ],
        ['node:*'],
      ]),
    },
  },
  {
    files: ['tools/database/{src,migrations}/**/*.{ts,tsx}'],
    languageOptions: { globals: nodeGlobals },
    rules: {
      'no-restricted-imports': restrictedImports([
        ['@sem-caderno/*'],
        ['fastify', 'next', 'next/*', 'react', 'react/*'],
      ]),
    },
  },
);
