import type { Locale as DateFnsLocale } from 'date-fns';
import { addMinutes, format as dfFormat, differenceInMinutes, parse, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { type Locale, type Messages } from '@/shared/i18n';

const ISO_DATE = 'yyyy-MM-dd';
const CLOCK = 'HH:mm';
const DAY_MIN = 24 * 60;
/** 시각(HH:mm) 산술의 기준일 — 날짜는 버리고 하루 안만 다룬다. DST 전환이 없는 날로 고정. */
const CLOCK_EPOCH = new Date(2001, 0, 1);

/** locale별 date-fns locale + 표시 패턴. locale마다 필드 순서가 달라 패턴을 여기서 지정한다. */
type DateFormatConfig = {
  locale: DateFnsLocale;
  /** 연도 없는 날짜 라벨 — '5월 2일 토요일'(long) / '5월 2일 (토)'(short) */
  dateLabel: { long: string; short: string };
  /** 요일 약칭 — '토' */
  weekday: string;
};

const DATE_FORMATS: Record<Locale, DateFormatConfig> = {
  // short의 괄호는 Intl ko가 날짜 문맥의 약칭 요일을 '(일)'로 내던 표기와 파리티를 맞춘 것.
  ko: { locale: ko, dateLabel: { long: 'M월 d일 EEEE', short: 'M월 d일 (EEE)' }, weekday: 'EEE' },
};

/** 로컬 기준 'YYYY-MM-DD' — 서버 계약(taskSchema.date)과 같은 표현. 문자열 비교가 곧 날짜 비교다. */
export function toIsoDate(date: Date): string {
  return dfFormat(date, ISO_DATE);
}

/** 서버 계약('YYYY-MM-DD')을 로컬 자정 Date로 파싱 — toIsoDate의 역. (date-only ISO → 로컬 00:00) */
export function parseIsoDate(iso: string): Date {
  return parseISO(iso);
}

/** 표시용 날짜 라벨 — locale에 맞춰 '5월 2일 토요일'(long) / '5월 2일 (토)'(short) */
export function formatDateLabel(locale: Locale, date: Date, weekday: 'long' | 'short' = 'long'): string {
  const cfg = DATE_FORMATS[locale];
  return dfFormat(date, cfg.dateLabel[weekday], { locale: cfg.locale });
}

/** 요일 약칭 — locale에 맞춰 '토' */
export function formatWeekday(locale: Locale, date: Date): string {
  const cfg = DATE_FORMATS[locale];
  return dfFormat(date, cfg.weekday, { locale: cfg.locale });
}

/** 'HH:mm' → 자정 기준 분 */
export function timeToMin(time: string): number {
  return differenceInMinutes(parse(time, CLOCK, CLOCK_EPOCH), CLOCK_EPOCH);
}

/** 분 → 'HH:mm' — 하루(0–24시) 안으로 클램프한다 */
export function minToTime(total: number): string {
  const clamped = Math.max(0, Math.min(DAY_MIN, total));
  // 24:00은 유효한 Date 시각으로 표현 불가(자정으로 롤오버)하니 하루 끝 경계만 별도 표기한다.
  if (clamped === DAY_MIN) return '24:00';
  return dfFormat(addMinutes(CLOCK_EPOCH, clamped), CLOCK);
}

/** 시작 시각 + 기간(분) → 종료 시각 'HH:mm' — 클램프·경계는 minToTime에 위임 */
export function endTime(startAt: string, durationMin: number): string {
  return minToTime(timeToMin(startAt) + durationMin);
}

/** 기간(분)을 로컬 문구로 — '30분' / '2시간' / '1시간 30분' */
export function formatDuration(t: Messages, durationMin: number): string {
  if (durationMin < 60) return t.common.duration.minutes({ min: durationMin });
  const hour = Math.floor(durationMin / 60);
  const min = durationMin % 60;
  return min === 0 ? t.common.duration.hours({ hour }) : t.common.duration.hoursMinutes({ hour, min });
}
