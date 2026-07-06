import type { Locale } from '@/shared/i18n';
import { toIsoDate } from '@/shared/time';

export type DayCell = {
  /** ISO 날짜 문자열 — React key 용 */
  key: string;
  /** 오늘 기준 오프셋(일). 목데이터 조회와 선택 상태의 기준. */
  offset: number;
  /** 요일 한 글자 (예: '토') */
  dow: string;
  /** 일(day of month) 숫자 */
  day: number;
  isToday: boolean;
  /** 히어로에 쓰는 전체 날짜 라벨 (예: '5월 3일 토요일') */
  label: string;
};

/** 가이드와 동일하게 오늘이 3번째 칸에 오도록 오늘-2일부터 7일 창을 만든다 */
export const WEEK_START_OFFSET = -2;
export const WEEK_LENGTH = 7;
export const TODAY_INDEX = -WEEK_START_OFFSET;

function dateAtOffset(now: Date, offset: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
}

/** 주간 창의 양 끝 날짜 — task.range 쿼리 입력. loader와 화면이 같은 값을 계산한다. */
export function weekRange(now: Date): { from: string; to: string } {
  return {
    from: toIsoDate(dateAtOffset(now, WEEK_START_OFFSET)),
    to: toIsoDate(dateAtOffset(now, WEEK_START_OFFSET + WEEK_LENGTH - 1)),
  };
}

export function buildWeek(now: Date, locale: Locale): DayCell[] {
  const dowFormat = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const labelFormat = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', weekday: 'long' });

  return Array.from({ length: WEEK_LENGTH }, (_, i) => {
    const offset = WEEK_START_OFFSET + i;
    const date = dateAtOffset(now, offset);
    return {
      key: toIsoDate(date),
      offset,
      dow: dowFormat.format(date),
      day: date.getDate(),
      isToday: offset === 0,
      label: labelFormat.format(date),
    };
  });
}
