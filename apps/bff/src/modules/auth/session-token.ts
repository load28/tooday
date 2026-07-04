export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** 저장용 해시 — 토큰 원문은 클라이언트만 가진다. DB 유출이 세션 탈취로 이어지지 않게 한다. */
export function hashSessionToken(token: string): string {
  return new Bun.CryptoHasher('sha256').update(token).digest('hex');
}
