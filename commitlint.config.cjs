// Enforces Conventional Commits. See CONTRIBUTING.md for the full spec.
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // new capability
        'fix',      // bug fix
        'docs',     // documentation only
        'style',    // formatting, no code meaning change
        'refactor', // neither fixes a bug nor adds a feature
        'perf',     // performance improvement
        'test',     // adding or correcting tests
        'build',    // build system or dependencies
        'ci',       // CI configuration
        'chore',    // maintenance
        'revert',   // reverts a previous commit
      ],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
  },
};
