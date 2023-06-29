module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'tmp'
      ]
    ],
    'scope-enum': [
      2,
      'always',
      [
        'front',
        'front-e2e',
        'back',
        'back-e2e',
        'shared',
        'meta',
        'deps',
        'db',
        'utils',
        'discord',
        'twitch'
      ]
    ],
    'subject-case': [
      1,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case']
    ],
    'body-max-line-length': [0, 'always', 0]
  }
};
