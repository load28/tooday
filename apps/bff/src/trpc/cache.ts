// 성공한 pub.* 쿼리만 public 캐시. 뮤테이션, 에러, pub 외 경로가 섞인 배치는 전부 no-store.
const CACHEABLE_PREFIX = 'pub.';

const DEFAULT_PUBLIC_CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

const CACHE_CONTROL_BY_PATH: Record<string, string> = {
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
    return { headers: { 'cache-control': 'private, no-store' } };
  }

  const cacheControl =
    paths.length === 1 ? (CACHE_CONTROL_BY_PATH[paths[0] as string] ?? DEFAULT_PUBLIC_CACHE) : DEFAULT_PUBLIC_CACHE;
  return { headers: { 'cache-control': cacheControl } };
}
