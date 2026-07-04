import { describe, expect, it } from 'bun:test';
import { orderKeyAfter, orderKeyBetween } from '@bff/platform/ordering';

describe('fractional ordering key', () => {
  it('맨 뒤 추가를 반복해도 항상 증가하고 키가 짧게 유지된다', () => {
    let last: string | null = null;
    const keys: string[] = [];
    for (let i = 0; i < 2000; i++) {
      const next = orderKeyAfter(last);
      if (last !== null) expect(next > last).toBe(true);
      keys.push(next);
      last = next;
    }
    // 정수부가 자릿수 마커를 갖는 Figma 방식이라 append는 O(log N)로만 자란다
    expect(Math.max(...keys.map((k) => k.length))).toBeLessThanOrEqual(5);
  });

  it('같은 틈에 1,000번 연속으로 끼워도 고갈되지 않는다 (float면 ~50번에 고갈)', () => {
    let low = orderKeyAfter(null);
    const high = orderKeyAfter(low);
    const seen = new Set<string>([low, high]);
    for (let i = 0; i < 1000; i++) {
      const mid: string = orderKeyBetween(low, high);
      expect(mid > low && mid < high).toBe(true);
      expect(seen.has(mid)).toBe(false);
      seen.add(mid);
      low = mid; // 항상 같은 위쪽 틈을 다시 쪼갠다 — 최악 시나리오
    }
  });

  it('키는 ASCII로만 구성된다 — collate "C" 바이트 비교와 JS 문자열 비교가 일치', () => {
    const samples = [orderKeyAfter(null), orderKeyBetween(null, orderKeyAfter(null)), orderKeyAfter(orderKeyAfter(null))];
    for (const key of samples) {
      expect([...key].every((ch) => ch.charCodeAt(0) >= 0x21 && ch.charCodeAt(0) <= 0x7e)).toBe(true);
    }
  });

  it('맨 앞 삽입도 무한히 가능하다', () => {
    let first: string | null = orderKeyAfter(null);
    for (let i = 0; i < 500; i++) {
      const before: string = orderKeyBetween(null, first);
      expect(before < first).toBe(true);
      first = before;
    }
  });
});
