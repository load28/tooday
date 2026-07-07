import { describe, expect, it } from 'bun:test';
import { createAccessTokenService } from '@bff/modules/auth/access-token';

const CLAIMS = { userId: '00000000-0000-0000-0000-000000000001', sessionId: '00000000-0000-0000-0000-0000000000aa' };

describe('createAccessTokenService', () => {
  it('서명한 토큰을 검증하면 클레임(userId+sid)을 돌려준다', async () => {
    const service = createAccessTokenService({ secret: 'secret', ttlMs: 60_000 });
    const token = await service.sign(CLAIMS);
    expect(token.split('.')).toHaveLength(3); // JWT 형태
    expect(await service.verify(token)).toEqual(CLAIMS);
  });

  it('만료된 토큰은 null', async () => {
    const service = createAccessTokenService({ secret: 'secret', ttlMs: -60_000 });
    expect(await service.verify(await service.sign(CLAIMS))).toBeNull();
  });

  it('다른 시크릿으로 서명된 토큰은 null (변조 방지)', async () => {
    const signer = createAccessTokenService({ secret: 'secret-a', ttlMs: 60_000 });
    const verifier = createAccessTokenService({ secret: 'secret-b', ttlMs: 60_000 });
    expect(await verifier.verify(await signer.sign(CLAIMS))).toBeNull();
  });

  it('토큰이 아닌 문자열은 null', async () => {
    const service = createAccessTokenService({ secret: 'secret', ttlMs: 60_000 });
    expect(await service.verify('not-a-jwt')).toBeNull();
  });
});
