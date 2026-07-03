import type { pubRouter } from '@bff/modules/pub/router';

const CACHEABLE_PATH_PREFIX = 'pub.';

/** 캐시 가능한 경로 = pub 라우터에 실제 존재하는 프로시저. 라우터가 바뀌면 타입도 따라간다 */
export type CacheablePath = `${typeof CACHEABLE_PATH_PREFIX}${Extract<keyof (typeof pubRouter)['_def']['procedures'], string>}`;

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
} as const satisfies Partial<Record<CacheablePath, PublicCacheDirectives>>;

export function serializePublicCacheControl({ maxAge, sMaxAge, staleWhileRevalidate }: PublicCacheDirectives): string {
  return `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;
}

function hasPathDirectives(path: string): path is keyof typeof CACHE_DIRECTIVES_BY_PATH {
  return path in CACHE_DIRECTIVES_BY_PATH;
}

export interface ResponseMetaInput {
  paths?: readonly string[];
  type: string;
  errors: readonly unknown[];
}

type CacheableResponseMeta = ResponseMetaInput & { paths: readonly string[] };

/** 캐시 정책의 핵심 술어: 성공한 pub.* 단독 쿼리만 public 캐시 대상이다 */
export function isPubliclyCacheable(input: ResponseMetaInput): input is CacheableResponseMeta {
  const { paths, type, errors } = input;
  return (
    type === 'query' &&
    errors.length === 0 &&
    paths !== undefined &&
    paths.length > 0 &&
    paths.every((path) => path.startsWith(CACHEABLE_PATH_PREFIX))
  );
}

export function resolveCacheControl(input: ResponseMetaInput): string {
  if (!isPubliclyCacheable(input)) return PRIVATE_CACHE_CONTROL;

  const singlePath = input.paths.length === 1 ? input.paths[0] : undefined;
  const directives =
    singlePath !== undefined && hasPathDirectives(singlePath)
      ? CACHE_DIRECTIVES_BY_PATH[singlePath]
      : DEFAULT_PUBLIC_CACHE_DIRECTIVES;
  return serializePublicCacheControl(directives);
}

export function trpcResponseMeta(input: ResponseMetaInput) {
  return { headers: { 'cache-control': resolveCacheControl(input) } };
}
