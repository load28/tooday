import { ToggleGroup } from '@ark-ui/react/toggle-group';
import type { Project, ProjectColor } from '@tooday/shared';
import { Check, ChevronRight, Plus } from 'lucide-react';
import { Children, Fragment, type ReactNode, useState } from 'react';
import { css } from 'styled-system/css';
import { token } from 'styled-system/tokens';
import { useT } from '@/shared/i18n';
import { endTime, formatDuration } from '@/shared/time';
import { BottomSheet, Button, Card, Divider, Dot, HStack, Input, Row, Stack, Text } from '@/shared/ui';

/** 프로젝트 선택 시트의 '없음' 옵션 키 — 태스크의 projectId=null에 대응 (UUID와 충돌하지 않는 sentinel) */
export const NO_PROJECT_KEY = '__none__';

/** 프로젝트 선택 시트 옵션 — 맨 앞에 '없음', 이어서 색 점을 단 프로젝트들 */
export function useProjectOptions(projects: Project[]): SheetOption<string>[] {
  const t = useT();
  return [
    { key: NO_PROJECT_KEY, label: t.common.noProject, leading: <Dot size="sm" tone="muted" /> },
    ...projects.map((project) => ({
      key: project.id,
      label: project.name,
      leading: <Dot size="sm" tone={project.color} />,
    })),
  ];
}

/** 스케줄 시트에서 고를 수 있는 기간(분) 프리셋 */
const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

const fullWidthCls = css({ width: '100%' });
const valueCls = css({ display: 'inline-flex', alignItems: 'center', gap: 'sm', minWidth: 0 });
const checkCls = css({ color: 'primary', flex: '0 0 auto' });
const durationRowCls = css({ display: 'flex', flexWrap: 'wrap', gap: 'sm' });

type MetaRowProps = {
  label: string;
  /** 이미 스타일이 입혀진 값 노드 (Dot·Text 조합 등) */
  value: ReactNode;
  onClick?: () => void;
};

/** 상세·신규 화면의 메타 카드 한 줄 — 좌측 라벨 + 우측 값(+ 편집 가능하면 chevron) */
export function MetaRow({ label, value, onClick }: MetaRowProps) {
  const interactive = onClick !== undefined;
  return (
    <Row
      as={interactive ? 'button' : 'div'}
      interactive={interactive || undefined}
      onClick={onClick}
      trailing={
        <>
          <span className={valueCls}>{value}</span>
          {interactive ? <ChevronRight size={16} color={token('colors.textPlaceholder')} /> : null}
        </>
      }
    >
      <Text variant="label" tone="secondary">
        {label}
      </Text>
    </Row>
  );
}

/** MetaRow들을 하나의 카드로 묶고 사이에 구분선을 넣는다 */
export function MetaList({ children }: { children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <Card padding="none">
      {rows.map((row, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 정적 메타 행 — 순서가 곧 정체성
        <Fragment key={index}>
          {index > 0 ? <Divider /> : null}
          {row}
        </Fragment>
      ))}
    </Card>
  );
}

export type SheetOption<K extends string> = {
  key: K;
  label: string;
  leading?: ReactNode;
};

/** 옵션 목록 아래에 붙는 보조 액션 — 예: 프로젝트 선택 시트의 '새 프로젝트 만들기' */
export type SheetAction = {
  label: string;
  onClick: () => void;
};

type OptionSheetProps<K extends string> = {
  open: boolean;
  onClose: () => void;
  title: string;
  options: SheetOption<K>[];
  selectedKey: K;
  onSelect: (key: K) => void;
  action?: SheetAction;
};

/** 단일 선택 바텀시트 — 상태·프로젝트 선택에 공용 */
export function OptionSheet<K extends string>({
  open,
  onClose,
  title,
  options,
  selectedKey,
  onSelect,
  action,
}: OptionSheetProps<K>) {
  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel={title}>
      <BottomSheet.Header>
        <BottomSheet.Title>{title}</BottomSheet.Title>
      </BottomSheet.Header>
      <Stack gap="2xs">
        {options.map((option) => (
          <Row
            key={option.key}
            as="button"
            interactive
            inset="flush"
            leading={option.leading}
            trailing={option.key === selectedKey ? <Check size={20} strokeWidth={2.6} className={checkCls} /> : null}
            onClick={() => onSelect(option.key)}
          >
            <Text variant="bodyLg">{option.label}</Text>
          </Row>
        ))}
        {action ? (
          <>
            <Divider />
            <Row
              as="button"
              interactive
              inset="flush"
              leading={<Plus size={18} strokeWidth={2.4} className={checkCls} />}
              onClick={action.onClick}
            >
              <Text variant="bodyLg" tone="brand">
                {action.label}
              </Text>
            </Row>
          </>
        ) : null}
      </Stack>
    </BottomSheet>
  );
}

type ScheduleSheetProps = {
  open: boolean;
  onClose: () => void;
  startAt: string;
  durationMin: number;
  onApply: (startAt: string, durationMin: number) => void;
};

/**
 * 시작 시각 + 기간 선택 바텀시트.
 * 시트는 닫히면 unmount 되므로(BottomSheet lazyMount) 다시 열 때 startAt·durationMin으로
 * 초안이 새로 초기화된다 — 별도 리셋이 필요 없다.
 */
export function ScheduleSheet({ open, onClose, startAt, durationMin, onApply }: ScheduleSheetProps) {
  const t = useT();
  const [draftStart, setDraftStart] = useState(startAt);
  const [draftDuration, setDraftDuration] = useState(durationMin);

  return (
    <BottomSheet open={open} onClose={onClose} ariaLabel={t.taskDetail.changeSchedule}>
      <BottomSheet.Header>
        <BottomSheet.Title>{t.taskDetail.changeSchedule}</BottomSheet.Title>
      </BottomSheet.Header>
      <Stack gap="2xl">
        <Stack gap="md">
          <Text variant="label" tone="secondary">
            {t.schedule.startLabel}
          </Text>
          <Input type="time" step={900} value={draftStart} onChange={(event) => setDraftStart(event.currentTarget.value)} />
        </Stack>
        <Stack gap="md">
          <Text variant="label" tone="secondary">
            {t.schedule.durationLabel}
          </Text>
          <ToggleGroup.Root
            value={[String(draftDuration)]}
            onValueChange={(details) => {
              // 단일 선택 — 선택된 알약을 다시 눌러 빈 상태가 되는 것은 무시한다
              const next = details.value[0];
              if (next !== undefined) setDraftDuration(Number(next));
            }}
            aria-label={t.schedule.durationLabel}
            className={durationRowCls}
          >
            {DURATION_OPTIONS.map((option) => (
              <ToggleGroup.Item key={option} value={String(option)} asChild>
                <Button tone="subtle" shape="pill" size="sm">
                  {formatDuration(t, option)}
                </Button>
              </ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
        </Stack>
        <Button tone="brand" size="lg" className={fullWidthCls} onClick={() => onApply(draftStart, draftDuration)}>
          {t.schedule.apply}
        </Button>
      </Stack>
    </BottomSheet>
  );
}

/** 메타 행의 '시간' 값 — '09:00 – 09:30 · 30분' */
export function ScheduleValue({ startAt, durationMin }: { startAt: string; durationMin: number }) {
  const t = useT();
  return (
    <HStack gap="sm">
      <Text variant="numeric" tone="default">
        {startAt} – {endTime(startAt, durationMin)}
      </Text>
      <Text variant="caption" tone="tertiary">
        {formatDuration(t, durationMin)}
      </Text>
    </HStack>
  );
}

/** 메타 행의 '프로젝트' 값 — 색 점 + 이름, 없으면 '프로젝트 없음' */
export function ProjectValue({ name, color }: { name: string | null; color?: ProjectColor }) {
  const t = useT();
  return (
    <HStack gap="sm">
      {color !== undefined ? <Dot size="sm" tone={color} /> : null}
      <Text variant="bodyStrong" tone={name === null ? 'tertiary' : 'default'} truncate>
        {name ?? t.common.noProject}
      </Text>
    </HStack>
  );
}
