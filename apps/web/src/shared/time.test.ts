import { describe, expect, it } from 'vitest';
import { endTime, formatDateLabel, formatWeekday, minToTime, parseIsoDate, timeToMin, toIsoDate } from '@/shared/time';

// 2026-05-02는 토요일 — locale 표시 파리티 고정용 기준일
const SATURDAY = new Date(2026, 4, 2);

describe('toIsoDate / parseIsoDate', () => {
  it('로컬 기준 YYYY-MM-DD로 포맷한다', () => {
    expect(toIsoDate(SATURDAY)).toBe('2026-05-02');
    expect(toIsoDate(new Date(2026, 0, 9))).toBe('2026-01-09');
  });

  it('ISO 날짜 문자열을 로컬 자정 Date로 파싱한다 (toIsoDate의 역)', () => {
    const parsed = parseIsoDate('2026-05-02');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(4);
    expect(parsed.getDate()).toBe(2);
    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
  });

  it('왕복(round-trip)이 보존된다', () => {
    expect(toIsoDate(parseIsoDate('2026-12-25'))).toBe('2026-12-25');
  });
});

describe('formatDateLabel (ko)', () => {
  it('long은 요일 전체명 — 기존 Intl 출력과 동일', () => {
    expect(formatDateLabel('ko', SATURDAY, 'long')).toBe('5월 2일 토요일');
  });

  it('short는 괄호 약칭 요일 — 기존 Intl 출력과 동일', () => {
    expect(formatDateLabel('ko', SATURDAY, 'short')).toBe('5월 2일 (토)');
  });

  it('기본값은 long', () => {
    expect(formatDateLabel('ko', SATURDAY)).toBe('5월 2일 토요일');
  });
});

describe('formatWeekday (ko)', () => {
  it('요일 약칭을 낸다 — 기존 Intl { weekday: short } 출력과 동일', () => {
    expect(formatWeekday('ko', SATURDAY)).toBe('토');
  });
});

describe('timeToMin', () => {
  it('HH:mm을 자정 기준 분으로 변환한다', () => {
    expect(timeToMin('00:00')).toBe(0);
    expect(timeToMin('09:00')).toBe(540);
    expect(timeToMin('09:30')).toBe(570);
    expect(timeToMin('23:59')).toBe(1439);
  });
});

describe('minToTime', () => {
  it('분을 HH:mm으로 포맷한다', () => {
    expect(minToTime(0)).toBe('00:00');
    expect(minToTime(540)).toBe('09:00');
    expect(minToTime(570)).toBe('09:30');
    expect(minToTime(1439)).toBe('23:59');
  });

  it('하루 범위 밖은 0–24시로 클램프한다', () => {
    expect(minToTime(-30)).toBe('00:00');
    expect(minToTime(24 * 60)).toBe('24:00');
    expect(minToTime(24 * 60 + 30)).toBe('24:00');
  });
});

describe('endTime', () => {
  it('시작 시각 + 기간(분) → 종료 시각', () => {
    expect(endTime('09:00', 30)).toBe('09:30');
    expect(endTime('09:00', 90)).toBe('10:30');
  });

  it('하루 끝을 넘으면 24:00으로 클램프한다', () => {
    expect(endTime('23:30', 60)).toBe('24:00');
    expect(endTime('23:00', 90)).toBe('24:00');
  });
});
