// @ts-check
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import checkFile from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';
import jsdoc from 'eslint-plugin-jsdoc';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const TS_FILES = ['**/*.{ts,tsx}'];
const TEST_FILES = ['**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}'];

export default tseslint.config(
  { ignores: ['**/node_modules/', '**/dist/', '**/coverage/'] },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: { ...globals.node },
    },
  },

  {
    files: TS_FILES,
    plugins: {
      import: importPlugin,
      'check-file': checkFile,
      '@eslint-community/eslint-comments': eslintComments,
    },
    rules: {
      'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 40, skipBlankLines: true, skipComments: true }],
      complexity: ['error', 8],
      'max-params': ['error', 3],
      'max-depth': ['error', 3],
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'no-warning-comments': ['error', { terms: ['todo', 'fixme', 'xxx', 'hack'] }],
      '@eslint-community/eslint-comments/require-description': 'error',
      '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      // `const { dropped: _dropped, ...kept } = value` is the idiomatic way to omit a field.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          // Type-only imports sort with their source's group instead of forming their own.
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          pathGroups: [{ pattern: '@saans/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx}': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': ['error', { '**/src/**/': 'KEBAB_CASE' }],
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
  },

  // Every exported function, type and component must carry a JSDoc block.
  {
    files: TS_FILES,
    ...jsdoc.configs['flat/recommended-typescript-error'],
  },
  {
    files: TS_FILES,
    rules: {
      'jsdoc/require-jsdoc': [
        'error',
        {
          publicOnly: true,
          require: {
            FunctionDeclaration: true,
            // Exported arrow consts are covered by the VariableDeclaration context below;
            // arrows used as values inside an already-documented object need no own block.
            ArrowFunctionExpression: false,
            FunctionExpression: true,
            ClassDeclaration: true,
            MethodDefinition: true,
          },
          contexts: [
            'TSInterfaceDeclaration',
            'TSTypeAliasDeclaration',
            'TSEnumDeclaration',
            'ExportNamedDeclaration > VariableDeclaration',
          ],
        },
      ],
      'jsdoc/require-throws': 'error',
    },
  },

  {
    files: ['web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { ...globals.browser } },
    rules: { ...reactHooks.configs.recommended.rules },
  },
  {
    files: ['web/**/*.tsx'],
    ...jsxA11y.flatConfigs.recommended,
  },

  // Test suites group many cases inside one describe() callback, so the per-function
  // line cap would only force artificial splitting. Every other limit still applies.
  {
    files: TEST_FILES,
    rules: {
      'max-lines-per-function': 'off',
      'jsdoc/require-jsdoc': 'off',
    },
  },

  // Plain JS config files are not part of any tsconfig, so skip type-aware rules there.
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked,
  },

  prettier,
);
