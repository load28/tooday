import { describe, expect, it } from 'bun:test';
import {
  CACHE_DIRECTIVES_BY_PATH,
  DEFAULT_PUBLIC_CACHE_DIRECTIVES,
  PRIVATE_CACHE_CONTROL,
  resolveCacheControl,
  serializePublicCacheControl,
} from './cache';

describe('serializePublicCacheControl', () => {
  it('디렉티브를 표준 Cache-Control 문자열로 직렬화한다', () => {
    const serialized = serializePublicCacheControl({ maxAge: 1, sMaxAge: 2, staleWhileRevalidate: 3 });
    expect(serialized).toBe('public, max-age=1, s-maxage=2, stale-while-revalidate=3');
  });
});

describe('resolveCacheControl', () => {
  it('뮤테이션은 캐시하지 않는다', () => {
    expect(resolveCacheControl({ paths: ['pub.appConfig'], type: 'mutation', errors: [] })).toBe(PRIVATE_CACHE_CONTROL);
  });

  it('에러가 있으면 캐시하지 않는다', () => {
    expect(resolveCacheControl({ paths: ['pub.appConfig'], type: 'query', errors: [new Error('boom')] })).toBe(
      PRIVATE_CACHE_CONTROL,
    );
  });

  it('경로가 없으면 캐시하지 않는다', () => {
    expect(resolveCacheControl({ paths: undefined, type: 'query', errors: [] })).toBe(PRIVATE_CACHE_CONTROL);
    expect(resolveCacheControl({ paths: [], type: 'query', errors: [] })).toBe(PRIVATE_CACHE_CONTROL);
  });

  it('pub 외 경로가 섞인 배치는 캐시하지 않는다', () => {
    expect(resolveCacheControl({ paths: ['pub.appConfig', 'user.me'], type: 'query', errors: [] })).toBe(PRIVATE_CACHE_CONTROL);
  });

  it('단일 pub 경로는 경로별 디렉티브를 사용한다', () => {
    expect(resolveCacheControl({ paths: ['pub.appConfig'], type: 'query', errors: [] })).toBe(
      serializePublicCacheControl(CACHE_DIRECTIVES_BY_PATH['pub.appConfig']),
    );
  });

  it('디렉티브가 정의되지 않은 pub 경로는 기본 디렉티브를 사용한다', () => {
    expect(resolveCacheControl({ paths: ['pub.unknown'], type: 'query', errors: [] })).toBe(
      serializePublicCacheControl(DEFAULT_PUBLIC_CACHE_DIRECTIVES),
    );
  });

  it('pub 경로만으로 구성된 배치는 기본 디렉티브를 사용한다', () => {
    expect(resolveCacheControl({ paths: ['pub.appConfig', 'pub.unknown'], type: 'query', errors: [] })).toBe(
      serializePublicCacheControl(DEFAULT_PUBLIC_CACHE_DIRECTIVES),
    );
  });
});
