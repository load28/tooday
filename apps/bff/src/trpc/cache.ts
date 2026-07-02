// 성공한 pub.* 쿼리만 public 캐시. 뮤테이션, 에러, pub 외 경로가 섞인 배치는 전부 no-store.
const CACHEABLE_PREFIX = 'pub.';

export const CACHE_CONTROL = {
  private: 'private, no-store',
  publicDefault: 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
} as const;

export const CACHE_CONTROL_BY_PATH: Record<string, string> = {
  'pub.appConfig': 'public, max-age=300, s-maxage=600, stale-while-revalidate=3600',
};

interface ResponseMetaInput {
  paths?: readonly string[];
  type: string;
  errors: readonly unknown[];
}

export function trpcResponseMeta({ paths, type, errors }: ResponseMetaInput) {
  const cacheable =
    type === 'query' &&
    errors.length === 0 &&
    !!paths &&
    paths.length > 0 &&
    paths.every((path) => path.startsWith(CACHEABLE_PREFIX));

  if (!cacheable) {
    return { headers: { 'cache-control': CACHE_CONTROL.private } };
  }

  const cacheControl =
    paths.length === 1 ? (CACHE_CONTROL_BY_PATH[paths[0] as string] ?? CACHE_CONTROL.publicDefault) : CACHE_CONTROL.publicDefault;
  return { headers: { 'cache-control': cacheControl } };
}
