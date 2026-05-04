import type { CSSProperties } from 'react';
import { TOKENS } from '@/lib/tokens';
import { taskDetailStyles } from './task-detail';

export const guideStyles: Record<string, CSSProperties> = {
  root: { padding: '0 16px 32px', display: 'flex', flexDirection: 'column', gap: 20 },
  hero: { padding: '4px 8px 0' },
  heroTitle: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '-0.03em',
    margin: 0,
    color: TOKENS.color.textPrimary,
  },
  heroDesc: {
    fontSize: 13,
    color: TOKENS.color.textTertiary,
    margin: '6px 0 0',
    fontWeight: 500,
  },
  block: { display: 'flex', flexDirection: 'column', gap: 10 },
  blockHead: { padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 2 },
  blockTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: TOKENS.color.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    margin: 0,
  },
  blockCaption: { fontSize: 11, color: TOKENS.color.textPlaceholder, margin: 0 },
  card: {
    background: TOKENS.color.surface,
    borderRadius: 16,
    padding: 18,
    boxShadow: TOKENS.shadow.card,
  },
  swatchGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 },
  swatch: { display: 'flex', flexDirection: 'column', gap: 4 },
  chip: { height: 56, borderRadius: 10, border: `1px solid ${TOKENS.color.border}` },
  swatchLabel: { fontSize: 12, fontWeight: 700 },
  swatchVal: { fontSize: 10, color: TOKENS.color.textTertiary, fontFeatureSettings: '"tnum" 1' },
  typeRow: {
    display: 'flex',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderTop: `1px solid ${TOKENS.color.divider}`,
    gap: 12,
  },
  typeLabel: { fontSize: 12, color: TOKENS.color.textTertiary, fontWeight: 600 },
};

const COLORS: { label: string; val: string }[] = [
  { label: 'BG', val: '#f5f6f8' },
  { label: 'Surface', val: '#ffffff' },
  { label: 'Soft', val: '#f2f4f6' },
  { label: 'Border', val: '#e5e8eb' },
  { label: 'Primary', val: '#3182f6' },
  { label: 'P. Soft', val: '#e8f3ff' },
  { label: 'Text 1', val: '#191f28' },
  { label: 'Text 2', val: '#4e5968' },
  { label: 'Text 3', val: '#8b95a1' },
];

const PROJ_COLORS: { label: string; val: string }[] = [
  { label: 'Blue', val: '#3182f6' },
  { label: 'Mint', val: '#00c2a8' },
  { label: 'Violet', val: '#6a5af9' },
  { label: 'Amber', val: '#ff9f43' },
  { label: 'Pink', val: '#ff5d8f' },
  { label: 'Gray', val: '#8b95a1' },
];

const TYPES: { label: string; size: number; weight: number; sample: string }[] = [
  { label: 'Display · 28', size: 28, weight: 700, sample: '오늘 5월 3일' },
  { label: 'Title · 22', size: 22, weight: 700, sample: '디자인 토큰 정리' },
  { label: 'Body L · 16', size: 16, weight: 700, sample: '시간 뷰 프로토타입' },
  { label: 'Body · 14', size: 14, weight: 600, sample: '오늘 할 일 7개 · 완료 1개' },
  { label: 'Caption · 12', size: 12, weight: 600, sample: '13:30 – 15:30 · 2시간' },
  { label: 'Tiny · 11', size: 11, weight: 600, sample: 'TooDay · Design Guide' },
];

export function GuidePage() {
  return (
    <div style={guideStyles.root}>
      <header style={guideStyles.hero}>
        <h1 style={guideStyles.heroTitle}>TooDay 디자인 가이드</h1>
        <p style={guideStyles.heroDesc}>회색 배경 + 흰 카드 + 부드러운 그림자. 액센트는 절제, 위계는 카드와 타이포로.</p>
      </header>

      <section style={guideStyles.block}>
        <header style={guideStyles.blockHead}>
          <h2 style={guideStyles.blockTitle}>Color · Surface</h2>
          <p style={guideStyles.blockCaption}>회색 배경 위에 흰 카드, 톤 차이는 명도로만.</p>
        </header>
        <div style={guideStyles.card}>
          <div style={guideStyles.swatchGrid}>
            {COLORS.map((c) => (
              <div key={c.label} style={guideStyles.swatch}>
                <div style={{ ...guideStyles.chip, background: c.val }} />
                <span style={guideStyles.swatchLabel}>{c.label}</span>
                <span style={guideStyles.swatchVal}>{c.val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={guideStyles.block}>
        <header style={guideStyles.blockHead}>
          <h2 style={guideStyles.blockTitle}>Color · Project</h2>
          <p style={guideStyles.blockCaption}>각 프로젝트 보드를 식별하는 6색.</p>
        </header>
        <div style={guideStyles.card}>
          <div style={guideStyles.swatchGrid}>
            {PROJ_COLORS.map((c) => (
              <div key={c.label} style={guideStyles.swatch}>
                <div style={{ ...guideStyles.chip, background: c.val, border: 'none' }} />
                <span style={guideStyles.swatchLabel}>{c.label}</span>
                <span style={guideStyles.swatchVal}>{c.val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={guideStyles.block}>
        <header style={guideStyles.blockHead}>
          <h2 style={guideStyles.blockTitle}>Typography</h2>
          <p style={guideStyles.blockCaption}>Pretendard · 자간 -0.02em ~ -0.03em.</p>
        </header>
        <div style={guideStyles.card}>
          {TYPES.map((t, i) => (
            <div
              key={t.label}
              style={{
                ...guideStyles.typeRow,
                borderTop: i === 0 ? 'none' : `1px solid ${TOKENS.color.divider}`,
                paddingTop: i === 0 ? 0 : 10,
              }}
            >
              <span style={{ fontSize: t.size, fontWeight: t.weight, letterSpacing: '-0.02em' }}>{t.sample}</span>
              <span style={guideStyles.typeLabel}>{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={guideStyles.block}>
        <header style={guideStyles.blockHead}>
          <h2 style={guideStyles.blockTitle}>Buttons</h2>
          <p style={guideStyles.blockCaption}>높이 52~54px · 굵은 라벨 · 액센트는 단 하나.</p>
        </header>
        <div style={{ ...guideStyles.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button type="button" style={taskDetailStyles.primaryBtn}>
            시작하기
          </button>
          <button
            type="button"
            style={{ ...taskDetailStyles.primaryBtn, background: TOKENS.color.surfaceSoft, color: TOKENS.color.textPrimary }}
          >
            나중에 하기
          </button>
          <button
            type="button"
            style={{ ...taskDetailStyles.primaryBtn, background: 'transparent', color: TOKENS.color.textSecondary }}
          >
            취소
          </button>
        </div>
      </section>

      <section style={guideStyles.block}>
        <header style={guideStyles.blockHead}>
          <h2 style={guideStyles.blockTitle}>Status Badge</h2>
          <p style={guideStyles.blockCaption}>3가지 상태 — 시작 전 / 진행 중 / 완료.</p>
        </header>
        <div style={{ ...guideStyles.card, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              ...taskDetailStyles.statusPill,
              background: TOKENS.color.surfaceSoft,
              color: TOKENS.color.textSecondary,
              cursor: 'default',
            }}
          >
            <span style={{ ...taskDetailStyles.statusDot, background: TOKENS.color.borderStrong }} />
            시작 전
          </span>
          <span
            style={{
              ...taskDetailStyles.statusPill,
              background: TOKENS.color.primarySoft,
              color: TOKENS.color.primary,
              cursor: 'default',
            }}
          >
            <span style={{ ...taskDetailStyles.statusDot, background: TOKENS.color.primary }} />
            진행 중
          </span>
          <span
            style={{
              ...taskDetailStyles.statusPill,
              background: TOKENS.color.successSoft,
              color: TOKENS.color.success,
              cursor: 'default',
            }}
          >
            <span style={{ ...taskDetailStyles.statusDot, background: TOKENS.color.success }} />
            완료
          </span>
        </div>
      </section>
    </div>
  );
}
