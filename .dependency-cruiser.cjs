/**
 * 공용 규칙 베이스. 각 앱의 tsconfig 별칭(@bff/*, @/*)을 해석해야 규칙이 실제로
 * 동작하므로, 앱별 .dependency-cruiser.cjs가 이 파일을 상속해 tsConfig만 바꾼다.
 * 실행은 루트 `bun run lint:deps`가 앱별 + packages 크루즈를 순서대로 수행한다.
 *
 * @type {import('dependency-cruiser').IConfiguration}
 */
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
    {
      name: 'bff-no-cross-module',
      severity: 'error',
      comment: 'bff 도메인 모듈끼리 직접 import 금지 — 조립은 trpc/router.ts와 app 부트스트랩에서만.',
      from: { path: '^apps/bff/src/modules/([^/]+)/' },
      to: { path: '^apps/bff/src/modules/([^/]+)/', pathNot: ['^apps/bff/src/modules/$1/'] },
    },
    {
      name: 'bff-platform-no-modules',
      severity: 'error',
      comment: 'bff platform(인프라·횡단 관심사)은 도메인 모듈을 알 수 없습니다.',
      from: { path: '^apps/bff/src/platform/' },
      to: { path: '^apps/bff/src/modules/' },
    },
    {
      name: 'web-no-cross-feature',
      severity: 'error',
      comment:
        'web feature 슬라이스끼리 직접 import 금지 — 공용 코드는 shared/로 승격하고, 조립은 routes(배선 층)에서만.',
      from: { path: '^apps/web/src/features/([^/]+)/' },
      to: { path: '^apps/web/src/features/([^/]+)/', pathNot: ['^apps/web/src/features/$1/'] },
    },
    {
      name: 'web-layer-direction',
      severity: 'error',
      comment: 'web 레이어는 routes → features → app/shared 단방향 — shared/app은 상위 레이어를 import 할 수 없습니다.',
      from: { path: '^apps/web/src/(shared|app)/' },
      to: { path: '^apps/web/src/(features|routes)/' },
    },
    {
      name: 'web-features-no-routes',
      severity: 'error',
      comment: 'web features는 routes(라우팅 배선)를 import 할 수 없습니다.',
      from: { path: '^apps/web/src/features/' },
      to: { path: '^apps/web/src/routes/' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.base.json' },
    // import type도 아키텍처 경계 위반이므로 컴파일 전 의존성 기준으로 검사한다
    tsPreCompilationDeps: true,
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
        '(^|/)styled-system/',
        '(^|/)\\.output/',
        '(^|/)\\.turbo/',
        '(^|/)\\.tanstack/',
      ],
    },
    cache: {
      folder: 'node_modules/.cache/dependency-cruiser/packages',
      strategy: 'metadata',
      compress: true,
    },
    progress: { type: 'none' },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
