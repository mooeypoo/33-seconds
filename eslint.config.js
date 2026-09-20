import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';

/**
 * The domain must stay pure TypeScript (ADR-0001 D1/D2): no browser globals, no wall-clock time,
 * no ambient randomness, no timers. These rules make a violation a failing build rather than a
 * code-review argument. The dependency-boundary check (`npm run check:arch`) covers imports.
 */
const domainBans = {
  'no-restricted-globals': [
    'error',
    { name: 'window', message: 'The domain is pure TypeScript. Browser access belongs in infrastructure.' },
    { name: 'document', message: 'The domain is pure TypeScript. DOM access belongs in infrastructure.' },
    { name: 'navigator', message: 'The domain is pure TypeScript. Platform access belongs in infrastructure.' },
    { name: 'localStorage', message: 'Storage goes through StoragePort in the application layer.' },
    { name: 'performance', message: 'The domain advances in fixed ticks. It never reads a clock.' },
    { name: 'setTimeout', message: 'Gameplay timing runs on the game clock, never on timers (ADR-0001 D7).' },
    { name: 'setInterval', message: 'Gameplay timing runs on the game clock, never on timers (ADR-0001 D7).' },
    { name: 'requestAnimationFrame', message: 'The domain does not drive frames. GameSession does.' },
    { name: 'Date', message: 'The domain never reads wall-clock time. Ticks are the only clock.' },
  ],
  'no-restricted-properties': [
    'error',
    { object: 'Math', property: 'random', message: 'Randomness is injected and seeded (ADR-0001 D3).' },
    { object: 'Date', property: 'now', message: 'The domain never reads wall-clock time.' },
    { object: 'performance', property: 'now', message: 'The domain never reads wall-clock time.' },
  ],
  'no-restricted-syntax': [
    'error',
    { selector: "NewExpression[callee.name='Date']", message: 'The domain never reads wall-clock time.' },
  ],
};

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**', 'coverage/**'] },

  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  // `essential` is the correctness half of the Vue rules. The formatting half is left out on
  // purpose: we do not have a formatter yet, and layout warnings would drown real findings.
  pluginVue.configs['flat/essential'],

  {
    languageOptions: {
      globals: { ...globals.browser },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      // Text is always rendered as text. No exceptions, anywhere (AGENTS.md, ADR-0001 D5).
      'vue/no-v-html': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // A leading underscore marks a parameter kept to satisfy an interface.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
    },
  },

  {
    files: ['src/domain/**/*.ts'],
    rules: domainBans,
  },

  {
    // Vue single-file components: vue-eslint-parser handles the template, and the TypeScript
    // parser handles <script setup lang="ts"> inside it.
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
  },

  {
    // The composition root imports .vue files, whose types ESLint's TypeScript service cannot
    // resolve. `npm run typecheck` (vue-tsc) is what actually checks these.
    files: ['src/main.ts'],
    rules: { '@typescript-eslint/no-unsafe-argument': 'off' },
  },

  {
    files: ['*.config.ts', 'e2e/**/*.ts', 'scripts/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },

  {
    // Tool configuration lives outside the TypeScript projects, so type-aware rules cannot run.
    files: ['eslint.config.js', '**/*.cjs', 'scripts/**/*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // These scripts exist to print things.
      'no-console': 'off',
    },
  },

  {
    files: ['tests/**/*.ts', 'e2e/**/*.ts'],
    rules: {
      // Tests assert on shapes the compiler cannot always narrow for us.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
);
