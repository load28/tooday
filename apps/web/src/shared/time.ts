import { format, type Messages } from '@/shared/i18n';

/** 로컬 기준 'YYYY-MM-DD' — 서버 계약(taskSchema.date)과 같은 표현. 문자열 비교가 곧 날짜 비교다. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** 'HH:mm' → 자정 기준 분 */
export function timeToMin(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}

/** 분 → 'HH:mm' — 하루(0–24시) 안으로 클램프한다 */
export function minToTime(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, total));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 시작 시각 + 기간(분) → 종료 시각 'HH:mm' */
export function endTime(startAt: string, durationMin: number): string {
  return minToTime(timeToMin(startAt) + durationMin);
}

/** 기간(분)을 로컬 문구로 — '30분' / '2시간' / '1시간 30분' */
export function formatDuration(t: Messages, durationMin: number): string {
  if (durationMin < 60) return format(t.common.duration.minutes, { min: durationMin });
  const hour = Math.floor(durationMin / 60);
  const min = durationMin % 60;
  return min === 0 ? format(t.common.duration.hours, { hour }) : format(t.common.duration.hoursMinutes, { hour, min });
}
