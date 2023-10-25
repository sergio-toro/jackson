module.exports = {
  bracketSpacing: true,
  bracketSameLine: true,
  singleQuote: true,
  jsxSingleQuote: true,
  trailingComma: 'es5',
  semi: true,
  printWidth: 110,
  arrowParens: 'always',
  plugins: ['@ianvs/prettier-plugin-sort-imports'],
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
};
