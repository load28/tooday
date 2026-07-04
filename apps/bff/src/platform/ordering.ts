import { generateKeyBetween } from 'fractional-indexing';

/**
 * 수동 정렬 키 — Figma 방식 fractional indexing.
 *
 * float 중간값 방식과 달리 키가 문자열이라 자릿수를 필요한 만큼 늘릴 수 있어
 * 어떤 순서로 몇 번을 끼워 넣어도 "사이값이 안 만들어지는" 정밀도 고갈이 없다.
 * 키는 ASCII 알파벳으로만 구성되며 바이트 순서 비교를 전제하므로,
 * DB 컬럼은 반드시 `text collate "C"`여야 한다 (로케일 collation 금지).
 */

/** 리스트 맨 뒤에 붙일 키. last가 null이면 첫 키. */
export function orderKeyAfter(last: string | null): string {
  return generateKeyBetween(last, null);
}

/** a와 b 사이에 끼울 키. a=null은 맨 앞, b=null은 맨 뒤. */
export function orderKeyBetween(a: string | null, b: string | null): string {
  return generateKeyBetween(a, b);
}
