/**
 * tRPC 응답의 HTTP 캐시 정책.
 *
 * 클라이언트는 노배치(httpLink)가 기본이라 쿼리가 GET + 단일 경로 URL로 나가고,
 * 그 URL이 그대로 브라우저/CDN 캐시 키가 된다.
 * - pub.* 쿼리 (성공 시): public Cache-Control → 공유 캐시 허용
 * - 그 외 전부 (뮤테이션, 에러, pub 외 경로, pub 외가 섞인 배치): private, no-store
 */

const CACHEABLE_PREFIX = 'pub.';

const DEFAULT_PUBLIC_CACHE = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

/** 경로별 캐시 정책 오버라이드 */
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
