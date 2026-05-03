import { createFileRoute } from '@tanstack/react-router';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { DayList } from '@/components/day-list';
import { MobileShell, TopBar } from '@/components/mobile-shell';
import * as topBarStyles from '@/components/mobile-shell.css';
import { tasks } from '@/data/mock';
import * as styles from './index.css';

export const Route = createFileRoute('/_app/')({
  component: DayView,
});

const TODAY_INDEX = 2;

const DAYS: { label: string; isToday: boolean }[] = [
  { label: '5월 1일 목요일', isToday: false },
  { label: '5월 2일 금요일', isToday: false },
  { label: '5월 3일 토요일', isToday: true },
  { label: '5월 4일 일요일', isToday: false },
  { label: '5월 5일 월요일', isToday: false },
  { label: '5월 6일 화요일', isToday: false },
  { label: '5월 7일 수요일', isToday: false },
];

function DayView() {
  const [dayIdx, setDayIdx] = useState(TODAY_INDEX);
  const day = DAYS[dayIdx] ?? DAYS[TODAY_INDEX];
  if (!day) return null;

  const goPrev = () => setDayIdx((i) => Math.max(0, i - 1));
  const goNext = () => setDayIdx((i) => Math.min(DAYS.length - 1, i + 1));

  return (
    <MobileShell
      topBar={
        <TopBar
          title="오늘"
          right={
            <button type="button" className={topBarStyles.topBarBtn} aria-label="알림">
              <Bell size={20} />
            </button>
          }
        />
      }
    >
      <nav className={styles.dateNav} aria-label="날짜 이동">
        <button type="button" className={styles.dateNavBtn} onClick={goPrev} disabled={dayIdx === 0} aria-label="이전 날">
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          className={styles.dateNavTitle}
          onClick={() => setDayIdx(TODAY_INDEX)}
          aria-label={day.isToday ? day.label : `${day.label} — 오늘로 돌아가기`}
        >
          {day.label}
        </button>
        <button
          type="button"
          className={styles.dateNavBtn}
          onClick={goNext}
          disabled={dayIdx === DAYS.length - 1}
          aria-label="다음 날"
        >
          <ChevronRight size={22} />
        </button>
      </nav>

      <div className={styles.listWrap}>
        <DayList tasks={day.isToday ? tasks : []} />
      </div>
    </MobileShell>
  );
}
