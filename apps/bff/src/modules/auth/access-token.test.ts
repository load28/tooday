import { describe, expect, it } from 'bun:test';
import { createAccessTokenService } from '@bff/modules/auth/access-token';

const USER_ID = '00000000-0000-0000-0000-000000000001';

describe('createAccessTokenService', () => {
  it('서명한 토큰을 검증하면 userId를 돌려준다', async () => {
    const service = createAccessTokenService({ secret: 'secret', ttlMs: 60_000 });
    const token = await service.sign(USER_ID);
    expect(token.split('.')).toHaveLength(3); // JWT 형태
    expect(await service.verify(token)).toBe(USER_ID);
  });

  it('만료된 토큰은 null', async () => {
    const service = createAccessTokenService({ secret: 'secret', ttlMs: -60_000 });
    const token = await service.sign(USER_ID);
    expect(await service.verify(token)).toBeNull();
  });

  it('다른 시크릿으로 서명된 토큰은 null (변조 방지)', async () => {
    const signer = createAccessTokenService({ secret: 'secret-a', ttlMs: 60_000 });
    const verifier = createAccessTokenService({ secret: 'secret-b', ttlMs: 60_000 });
    expect(await verifier.verify(await signer.sign(USER_ID))).toBeNull();
  });

  it('토큰이 아닌 문자열은 null', async () => {
    const service = createAccessTokenService({ secret: 'secret', ttlMs: 60_000 });
    expect(await service.verify('not-a-jwt')).toBeNull();
  });
});
