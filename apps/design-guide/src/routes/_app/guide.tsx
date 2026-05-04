import { createFileRoute } from '@tanstack/react-router';
import * as atoms from '@/components/atoms.css';
import { MobileShell, TopBar } from '@/components/mobile-shell';
import { TaskCard } from '@/components/task-card';
import { tasks } from '@/data/mock';
import * as styles from './guide.css';

export const Route = createFileRoute('/_app/guide')({
  component: GuidePage,
});

const COLORS: { label: string; value: string; token: string }[] = [
  { label: 'BG', value: '#f5f6f8', token: 'color.bg' },
  { label: 'Surface', value: '#ffffff', token: 'color.surface' },
  { label: 'Muted', value: '#f9fafb', token: 'color.surfaceMuted' },
  { label: 'Border', value: '#e5e8eb', token: 'color.border' },
  { label: 'Primary', value: '#3182f6', token: 'color.primary' },
  { label: 'Soft', value: '#e8f3ff', token: 'color.primarySoft' },
  { label: 'Text 1', value: '#191f28', token: 'textPrimary' },
  { label: 'Text 2', value: '#4e5968', token: 'textSecondary' },
  { label: 'Text 3', value: '#8b95a1', token: 'textTertiary' },
];

const PROJECT_COLORS: { label: string; value: string }[] = [
  { label: 'Blue', value: '#3182f6' },
  { label: 'Mint', value: '#00c2a8' },
  { label: 'Violet', value: '#6a5af9' },
  { label: 'Amber', value: '#ff9f43' },
  { label: 'Pink', value: '#ff5d8f' },
  { label: 'Gray', value: '#8b95a1' },
];

const TYPES: { label: string; size: string; weight: number; sample: string }[] = [
  { label: 'Display · 28', size: '28px', weight: 700, sample: '오늘 5월 3일' },
  { label: 'Title · 24', size: '24px', weight: 700, sample: '디자인 토큰 정리' },
  { label: 'Subtitle · 20', size: '20px', weight: 700, sample: '프로젝트 보드' },
  { label: 'Body L · 17', size: '17px', weight: 600, sample: '시간 뷰 프로토타입' },
  { label: 'Body · 15', size: '15px', weight: 500, sample: '오늘 할 일 7개 · 완료 1개' },
  { label: 'Caption · 13', size: '13px', weight: 500, sample: '13:30 – 15:30 · 2시간' },
  { label: 'Tiny · 11', size: '11px', weight: 500, sample: 'TooDay · Design Guide' },
];

const SPACES: [string, number][] = [
  ['1', 4],
  ['2', 8],
  ['3', 12],
  ['4', 16],
  ['5', 20],
  ['6', 24],
  ['7', 32],
  ['8', 40],
];

const RADII: [string, string][] = [
  ['sm', '6px'],
  ['md', '10px'],
  ['lg', '14px'],
  ['xl', '20px'],
  ['pill', '999px'],
];

function GuidePage() {
  return (
    <MobileShell topBar={<TopBar title="디자인 가이드" />} showFab={false}>
      <div className={styles.root}>
        <header className={styles.hero}>
          <h1 className={styles.heroTitle}>TooDay Design Guide</h1>
          <p className={styles.heroDesc}>회색 배경 + 흰 카드 레이어. 액센트는 절제, 위계는 카드와 타이포로.</p>
        </header>

        <section className={styles.block}>
          <header className={styles.blockHeader}>
            <h2 className={styles.blockTitle}>COLOR · SURFACE</h2>
            <p className={styles.blockCaption}>회색 배경 위에 흰 카드, 톤 차이는 명도로만.</p>
          </header>
          <div className={`${atoms.card} ${styles.blockBody}`}>
            <div className={styles.swatchGrid}>
              {COLORS.map((c) => (
                <div key={c.label} className={styles.swatch}>
                  <div className={styles.swatchChip} style={{ background: c.value }} />
                  <span className={styles.swatchLabel}>{c.label}</span>
                  <span className={styles.swatchValue}>{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <header className={styles.blockHeader}>
            <h2 className={styles.blockTitle}>COLOR · PROJECT</h2>
            <p className={styles.blockCaption}>각 프로젝트 보드를 식별하는 6색.</p>
          </header>
          <div className={`${atoms.card} ${styles.blockBody}`}>
            <div className={styles.swatchGrid}>
              {PROJECT_COLORS.map((c) => (
                <div key={c.label} className={styles.swatch}>
                  <div className={styles.swatchChip} style={{ background: c.value }} />
                  <span className={styles.swatchLabel}>{c.label}</span>
                  <span className={styles.swatchValue}>{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <header className={styles.blockHeader}>
            <h2 className={styles.blockTitle}>TYPOGRAPHY</h2>
            <p className={styles.blockCaption}>Pretendard, 자간 -0.02em ~ -0.025em.</p>
          </header>
          <div className={`${atoms.card} ${styles.blockBody}`}>
            {TYPES.map((t) => (
              <div key={t.label} className={styles.typeRow}>
                <span style={{ fontSize: t.size, fontWeight: t.weight, letterSpacing: '-0.02em' }}>{t.sample}</span>
                <span className={styles.typeLabel}>{t.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.block}>
          <header className={styles.blockHeader}>
            <h2 className={styles.blockTitle}>SPACING</h2>
            <p className={styles.blockCaption}>4px 베이스. 여백을 충분히 둬서 정보 위계를 만든다.</p>
          </header>
          <div className={`${atoms.card} ${styles.blockBody}`}>
            <div className={styles.spaceList}>
              {SPACES.map(([name, px]) => (
                <div key={name} className={styles.spaceRow}>
                  <span style={{ width: 28, fontSize: 13, color: '#8b95a1', fontWeight: 600 }}>{name}</span>
                  <div className={styles.spaceBar} style={{ width: `${px}px` }} />
                  <span style={{ fontSize: 13, color: '#8b95a1' }}>{px}px</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <header className={styles.blockHeader}>
            <h2 className={styles.blockTitle}>RADIUS</h2>
            <p className={styles.blockCaption}>카드는 lg(14), 칩/뱃지는 pill, 버튼은 lg.</p>
          </header>
          <div className={`${atoms.card} ${styles.blockBody}`}>
            <div className={styles.radiusRow}>
              {RADII.map(([name, px]) => (
                <div key={name} className={styles.radiusChip} style={{ borderRadius: px }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#191f28' }}>{name}</span>
                  <span>{px}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <header className={styles.blockHeader}>
            <h2 className={styles.blockTitle}>BUTTONS</h2>
            <p className={styles.blockCaption}>높이 52px, 굵은 라벨, 액센트는 단 하나.</p>
          </header>
          <div className={`${atoms.card} ${styles.blockBody}`}>
            <div className={styles.buttonRow}>
              <button type="button" className={`${atoms.button} ${atoms.buttonVariants.primary}`}>
                시작하기
              </button>
              <button type="button" className={`${atoms.button} ${atoms.buttonVariants.secondary}`}>
                나중에 하기
              </button>
              <button type="button" className={`${atoms.button} ${atoms.buttonVariants.ghost}`}>
                취소
              </button>
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <header className={styles.blockHeader}>
            <h2 className={styles.blockTitle}>STATUS BADGE</h2>
            <p className={styles.blockCaption}>3가지 상태 — 시작 전 / 진행 중 / 완료.</p>
          </header>
          <div className={`${atoms.card} ${styles.blockBody}`}>
            <div className={styles.inlineRow}>
              <span className={`${atoms.statusBadge} ${atoms.statusBadgeVariants.todo}`}>시작 전</span>
              <span className={`${atoms.statusBadge} ${atoms.statusBadgeVariants.doing}`}>진행 중</span>
              <span className={`${atoms.statusBadge} ${atoms.statusBadgeVariants.done}`}>완료</span>
            </div>
          </div>
        </section>

        <section className={styles.block}>
          <header className={styles.blockHeader}>
            <h2 className={styles.blockTitle}>TASK CARD</h2>
            <p className={styles.blockCaption}>공통 카드 — 시간 뷰 / 프로젝트 보드 모두 사용.</p>
          </header>
          <div className={styles.cardStack}>
            {tasks.slice(2, 5).map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </div>
        </section>
      </div>
    </MobileShell>
  );
}
