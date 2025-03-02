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
        'back',
        'back-e2e',
        'shared',
        'meta',
        'deps',
        'deps-dev',
        'db',
        'xpsys',
        'utils',
        'scripts',
        'tools',
        'lint',
        'formats',
        'discord',
        'twitch',
        'prod',
        'ci'
      ]
    ],
    'subject-case': [
      1,
      'never',
      ['sentence-case', 'start-case', 'pascal-case', 'upper-case']
    ],
    'body-max-line-length': [0, 'always', 0],
    'scope-empty': [2, 'never']
  }
};
