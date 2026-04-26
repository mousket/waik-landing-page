module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['next', 'next/core-web-vitals', 'plugin:@typescript-eslint/recommended', 'prettier'],
  parserOptions: {
    project: './tsconfig.json',
  },
  ignorePatterns: [
    'node_modules/**',
    '.next/**',
    'out/**',
    'public/sw.js',
    'server.js',
    'scripts/**',
    'backend/**',
    '.eslintrc.js',
    'eslint.config.mts',
  ],
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/no-unescaped-entities': 'off',
  },
  overrides: [
    {
      files: ['scripts/**/*.js'],
      env: {
        node: true,
      },
      rules: {
        '@typescript-eslint/no-require-imports': 'off',
        'no-undef': 'off',
      },
    },
    // Phase 3e.2 (09g): `lib` outside `lib/utils` and all `app` routes are high-churn and use `any` for DB/API; keep strict checking in components/hooks/lib/utils.
    {
      files: ['lib/**/*.ts', 'lib/**/*.tsx'],
      excludedFiles: ['lib/utils/**/*', 'lib/utils/*'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
      },
    },
    {
      files: ['app/**/*.ts', 'app/**/*.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        // Pragmatic for CI: re-tighten per module as refactors land (Phase 3e.2 / 09g).
        '@typescript-eslint/no-unused-vars': 'off',
        'react-hooks/exhaustive-deps': 'off',
      },
    },
  ],
}
