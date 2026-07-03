const CACHEABLE_PATH_PREFIX = 'pub.';

export const PRIVATE_CACHE_CONTROL = 'private, no-store';

export interface PublicCacheDirectives {
  maxAge: number;
  sMaxAge: number;
  staleWhileRevalidate: number;
}

export const DEFAULT_PUBLIC_CACHE_DIRECTIVES: PublicCacheDirectives = {
  maxAge: 60,
  sMaxAge: 300,
  staleWhileRevalidate: 600,
};

export const CACHE_DIRECTIVES_BY_PATH = {
  'pub.appConfig': { maxAge: 300, sMaxAge: 600, staleWhileRevalidate: 3600 },
} as const satisfies Record<string, PublicCacheDirectives>;

type CacheablePath = keyof typeof CACHE_DIRECTIVES_BY_PATH;

export function serializePublicCacheControl({ maxAge, sMaxAge, staleWhileRevalidate }: PublicCacheDirectives): string {
  return `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
}

function isCacheablePath(path: string): path is CacheablePath {
  return path in CACHE_DIRECTIVES_BY_PATH;
}

export interface ResponseMetaInput {
  paths?: readonly string[];
  type: string;
  errors: readonly unknown[];
}

/**
 * 캐시 정책: 성공한 pub.* 쿼리만 public 캐시.
 * 뮤테이션, 에러, 경로 없음, pub 외 경로가 섞인 배치는 전부 private, no-store.
 */
export function resolveCacheControl({ paths, type, errors }: ResponseMetaInput): string {
  const cacheable =
    type === 'query' &&
    errors.length === 0 &&
    !!paths &&
    paths.length > 0 &&
    paths.every((path) => path.startsWith(CACHEABLE_PATH_PREFIX));

  if (!cacheable) return PRIVATE_CACHE_CONTROL;

  const singlePath = paths.length === 1 ? paths[0] : undefined;
  const directives =
    singlePath !== undefined && isCacheablePath(singlePath)
      ? CACHE_DIRECTIVES_BY_PATH[singlePath]
      : DEFAULT_PUBLIC_CACHE_DIRECTIVES;
  return serializePublicCacheControl(directives);
}

export function trpcResponseMeta(input: ResponseMetaInput) {
  return { headers: { 'cache-control': resolveCacheControl(input) } };
}
