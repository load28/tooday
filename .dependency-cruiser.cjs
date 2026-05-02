/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: '순환 의존성을 금지합니다.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'shared-cannot-import-apps',
      severity: 'error',
      comment: 'packages/shared는 apps/*를 import 할 수 없습니다 (단방향 의존성).',
      from: { path: '^packages/shared' },
      to: { path: '^apps/' },
    },
    {
      name: 'bff-cannot-import-web',
      severity: 'error',
      comment: 'apps/bff는 apps/web을 import 할 수 없습니다 (단방향 의존성).',
      from: { path: '^apps/bff' },
      to: { path: '^apps/web' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.base.json' },
    tsPreCompilationDeps: false,
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
      mainFields: ['module', 'main', 'types', 'typings'],
    },
    doNotFollow: { path: 'node_modules' },
    exclude: {
      path: [
        'node_modules',
        '\\.gen\\.ts$',
        '\\.css\\.ts$',
        '\\.(test|spec)\\.(ts|tsx)$',
        '(^|/)dist/',
        '(^|/)\\.output/',
        '(^|/)\\.turbo/',
        '(^|/)\\.tanstack/',
      ],
    },
    cache: {
      folder: 'node_modules/.cache/dependency-cruiser',
      strategy: 'metadata',
      compress: true,
    },
    progress: { type: 'none' },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
