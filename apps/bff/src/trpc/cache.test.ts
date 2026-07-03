import { describe, expect, it } from 'bun:test';
import type { CacheablePath } from '@bff/trpc/cache';
import {
  CACHE_DIRECTIVES_BY_PATH,
  DEFAULT_PUBLIC_CACHE_DIRECTIVES,
  isPubliclyCacheable,
  PRIVATE_CACHE_CONTROL,
  resolveCacheControl,
  serializePublicCacheControl,
} from '@bff/trpc/cache';

const APP_CONFIG_PATH = 'pub.appConfig' satisfies CacheablePath;
const PRIVATE_PATH = 'user.me';
const UNLISTED_PUB_PATH = 'pub.unlisted';

describe('serializePublicCacheControl', () => {
  it('디렉티브를 표준 Cache-Control 문자열로 직렬화한다', () => {
    const serialized = serializePublicCacheControl({ maxAge: 1, sMaxAge: 2, staleWhileRevalidate: 3 });
    expect(serialized).toBe('public, max-age=1, s-maxage=2, stale-while-revalidate=3');
  });
});

describe('isPubliclyCacheable', () => {
  it('성공한 pub.* 쿼리만 캐시 대상이다', () => {
    expect(isPubliclyCacheable({ paths: [APP_CONFIG_PATH], type: 'query', errors: [] })).toBe(true);
    expect(isPubliclyCacheable({ paths: [APP_CONFIG_PATH], type: 'mutation', errors: [] })).toBe(false);
    expect(isPubliclyCacheable({ paths: [APP_CONFIG_PATH], type: 'query', errors: [new Error('boom')] })).toBe(false);
    expect(isPubliclyCacheable({ paths: undefined, type: 'query', errors: [] })).toBe(false);
    expect(isPubliclyCacheable({ paths: [], type: 'query', errors: [] })).toBe(false);
    expect(isPubliclyCacheable({ paths: [APP_CONFIG_PATH, PRIVATE_PATH], type: 'query', errors: [] })).toBe(false);
  });
});

describe('resolveCacheControl', () => {
  it('캐시 대상이 아니면 private, no-store를 반환한다', () => {
    expect(resolveCacheControl({ paths: [APP_CONFIG_PATH], type: 'mutation', errors: [] })).toBe(PRIVATE_CACHE_CONTROL);
    expect(resolveCacheControl({ paths: [APP_CONFIG_PATH, PRIVATE_PATH], type: 'query', errors: [] })).toBe(
      PRIVATE_CACHE_CONTROL,
    );
  });

  it('단일 pub 경로는 경로별 디렉티브를 사용한다', () => {
    expect(resolveCacheControl({ paths: [APP_CONFIG_PATH], type: 'query', errors: [] })).toBe(
      serializePublicCacheControl(CACHE_DIRECTIVES_BY_PATH[APP_CONFIG_PATH]),
    );
  });

  it('디렉티브가 정의되지 않은 pub 경로는 기본 디렉티브를 사용한다', () => {
    expect(resolveCacheControl({ paths: [UNLISTED_PUB_PATH], type: 'query', errors: [] })).toBe(
      serializePublicCacheControl(DEFAULT_PUBLIC_CACHE_DIRECTIVES),
    );
  });

  it('pub 경로만으로 구성된 배치는 기본 디렉티브를 사용한다', () => {
    expect(resolveCacheControl({ paths: [APP_CONFIG_PATH, UNLISTED_PUB_PATH], type: 'query', errors: [] })).toBe(
      serializePublicCacheControl(DEFAULT_PUBLIC_CACHE_DIRECTIVES),
    );
  });
});
