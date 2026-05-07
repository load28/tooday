import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { css } from 'styled-system/css';
import {
  AppBar,
  BottomSheet,
  Card,
  Chip,
  Divider,
  Dot,
  HStack,
  Pressable,
  Row,
  Screen,
  Section,
  Spacer,
  Stack,
  Surface,
  Text,
} from '@/components/ui';

export const Route = createFileRoute('/design-system')({
  component: DesignSystemRoute,
});

const stagePadding = css({ paddingX: '4', paddingY: '5' });
const sectionGap = css({ display: 'flex', flexDirection: 'column', gap: '6', paddingBottom: '12' });

function DesignSystemRoute() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pressedId, setPressedId] = useState<string | null>(null);

  return (
    <Screen
      topBar={
        <AppBar
          title="Design System"
          leading={
            <Pressable size="icon" tone="ghost" aria-label="뒤로">
              ←
            </Pressable>
          }
          trailing={
            <Pressable size="icon" tone="ghost" aria-label="설정">
              ⋯
            </Pressable>
          }
        />
      }
    >
      <div className={`${stagePadding} ${sectionGap}`}>
        {/* Typography */}
        <Section title="Typography" description="textStyles 토큰으로만 정의된 텍스트 스케일">
          <Card padding="md">
            <Stack gap="3">
              <Text variant="display">디스플레이 24/700</Text>
              <Text variant="title">타이틀 18/700</Text>
              <Text variant="subtitle">서브타이틀 17/700</Text>
              <Text variant="bodyLg">본문 큰 16/500 — 카드 본문</Text>
              <Text variant="body">본문 14/500 — 일반 문장</Text>
              <Text variant="bodySm" tone="secondary">
                작은 본문 13/500 — 보조 설명
              </Text>
              <Text variant="label" tone="brand">
                라벨 13/700
              </Text>
              <Text variant="caption" tone="tertiary">
                캡션 12/500
              </Text>
              <Text variant="overline" tone="tertiary">
                Overline 13/700
              </Text>
              <Text variant="numeric">12:30 PM · 90분</Text>
            </Stack>
          </Card>
        </Section>

        {/* Surfaces */}
        <Section title="Surface · Card" description="배경 톤과 elevation의 시멘틱 프리셋">
          <Stack gap="3">
            <HStack gap="3" wrap>
              <Surface tone="surface" radius="lg" padding="md" bordered="hairline">
                <Text variant="bodySm">surface</Text>
              </Surface>
              <Surface tone="muted" radius="lg" padding="md">
                <Text variant="bodySm" tone="secondary">
                  muted
                </Text>
              </Surface>
              <Surface tone="soft" radius="lg" padding="md">
                <Text variant="bodySm" tone="secondary">
                  soft
                </Text>
              </Surface>
              <Surface tone="brandSoft" radius="lg" padding="md">
                <Text variant="bodySm">brandSoft</Text>
              </Surface>
            </HStack>
            <Card elevation="raised" padding="md">
              <Stack gap="2">
                <Text variant="subtitle">Card · raised</Text>
                <Text variant="bodySm" tone="secondary">
                  shadow.card 토큰을 사용한 표준 카드
                </Text>
              </Stack>
            </Card>
            <Card elevation="flat" padding="md">
              <Stack gap="2">
                <Text variant="subtitle">Card · flat</Text>
                <Text variant="bodySm" tone="secondary">
                  border만 있는 평면 카드
                </Text>
              </Stack>
            </Card>
          </Stack>
        </Section>

        {/* Row patterns */}
        <Section title="Row" description="리스트의 단위. Card/Surface 안에 Divider와 함께 배치">
          <Card padding="none">
            <Row
              leading={<Dot size="md" color="#3182f6" />}
              trailing={
                <Text variant="caption" tone="tertiary">
                  ›
                </Text>
              }
              interactive
              as="button"
              onClick={() => setPressedId('row-1')}
            >
              <Text variant="bodyLgStrong">디자인 시안 리뷰</Text>
              <Text variant="caption" tone="tertiary">
                09:00 · 30분
              </Text>
            </Row>
            <Divider inset="leading" />
            <Row
              leading={<Dot size="md" tone="success" />}
              trailing={
                <Chip tone="success" size="sm">
                  완료
                </Chip>
              }
              interactive
              as="button"
              onClick={() => setPressedId('row-2')}
            >
              <Text variant="bodyLgStrong">데일리 스탠드업</Text>
              <Text variant="caption" tone="tertiary">
                10:00 · 15분
              </Text>
            </Row>
            <Divider inset="leading" />
            <Row
              leading={<Dot size="md" tone="warning" />}
              trailing={
                <Chip tone="warning" size="sm">
                  진행중
                </Chip>
              }
              interactive
              as="button"
              onClick={() => setPressedId('row-3')}
            >
              <Text variant="bodyLgStrong">기획 문서 작성</Text>
              <Text variant="caption" tone="tertiary">
                11:30 · 60분
              </Text>
            </Row>
          </Card>
          <Surface tone="transparent" padding="none">
            <Text variant="caption" tone="tertiary">
              마지막 탭: {pressedId ?? '없음'}
            </Text>
          </Surface>
        </Section>

        {/* Standalone rows on canvas */}
        <Section title="Row on canvas" description="카드 밖에 단독으로 둘 수도 있다">
          <Stack gap="0">
            <Row
              leading={
                <Text variant="caption" tone="tertiary">
                  A
                </Text>
              }
            >
              <Text variant="body">알림 설정</Text>
            </Row>
            <Divider />
            <Row
              leading={
                <Text variant="caption" tone="tertiary">
                  B
                </Text>
              }
              trailing={<Text variant="caption">›</Text>}
            >
              <Text variant="body">계정</Text>
            </Row>
          </Stack>
        </Section>

        {/* Chips & Dots */}
        <Section title="Chip · Dot" description="라벨/배지/색칩">
          <HStack gap="2" wrap>
            <Chip tone="brand">브랜드</Chip>
            <Chip tone="success" leading={<Dot tone="success" />}>
              완료
            </Chip>
            <Chip tone="warning">진행중</Chip>
            <Chip tone="danger">위험</Chip>
            <Chip tone="outline">아웃라인</Chip>
            <Chip tone="neutral" size="sm">
              sm
            </Chip>
            <Chip tone="brand" size="lg">
              lg
            </Chip>
          </HStack>
        </Section>

        {/* Pressables */}
        <Section title="Pressable" description="모든 탭 가능한 베이스">
          <Stack gap="3">
            <HStack gap="2" wrap>
              <Pressable tone="brand">Primary</Pressable>
              <Pressable tone="brandSoft">Soft</Pressable>
              <Pressable tone="subtle">Subtle</Pressable>
              <Pressable tone="ghost">Ghost</Pressable>
              <Pressable tone="dangerSoft">Danger soft</Pressable>
            </HStack>
            <HStack gap="2">
              <Pressable tone="brand" size="sm">
                sm
              </Pressable>
              <Pressable tone="brand" size="md">
                md
              </Pressable>
              <Pressable tone="brand" size="lg">
                lg
              </Pressable>
              <Pressable tone="brand" size="icon" shape="circle" aria-label="추가">
                +
              </Pressable>
            </HStack>
          </Stack>
        </Section>

        {/* Stack patterns */}
        <Section title="Layout" description="Stack · HStack · Spacer">
          <Card padding="md">
            <HStack gap="3" align="center">
              <Surface tone="brandSoft" radius="md" padding="sm">
                <Text variant="captionStrong">A</Text>
              </Surface>
              <Stack gap="1">
                <Text variant="bodyStrong">왼쪽 콘텐츠</Text>
                <Text variant="caption" tone="tertiary">
                  설명 텍스트
                </Text>
              </Stack>
              <Spacer />
              <Chip tone="brand">메타</Chip>
            </HStack>
          </Card>
        </Section>

        {/* BottomSheet trigger */}
        <Section title="BottomSheet" description="모바일에서 가장 자주 쓰는 모달 패턴">
          <Pressable tone="brand" size="lg" onClick={() => setSheetOpen(true)}>
            바텀시트 열기
          </Pressable>
        </Section>
      </div>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="옵션 선택"
        description="이 시트는 시멘틱 프리미티브로 구성되어 있다"
      >
        <Stack gap="0">
          <Row interactive as="button" onClick={() => setSheetOpen(false)}>
            <Text variant="bodyLg">상세 보기</Text>
          </Row>
          <Divider />
          <Row interactive as="button" onClick={() => setSheetOpen(false)}>
            <Text variant="bodyLg">편집</Text>
          </Row>
          <Divider />
          <Row interactive as="button" onClick={() => setSheetOpen(false)}>
            <Text variant="bodyLg" tone="danger">
              삭제
            </Text>
          </Row>
        </Stack>
        <Pressable tone="subtle" size="lg" onClick={() => setSheetOpen(false)}>
          취소
        </Pressable>
      </BottomSheet>
    </Screen>
  );
}
