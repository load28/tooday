import type { StyleXStylesWithout } from '@stylexjs/stylex';

// 컴포넌트가 variant로 소유하는 속성을 사용처가 sx로 덮지 못하게 막는 타입 조각.
// StyleXStylesWithout<T>는 T의 키를 뺀 나머지 CSS 속성만 허용한다 — 값 타입은 쓰이지 않고
// 키만 쓰이므로 아래 그룹의 값 타입은 자리표시자다. (docs/conventions/ui-styling.md)

type Spacing = {
  padding: string;
  paddingInline: string;
  paddingBlock: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  paddingInlineStart: string;
  paddingInlineEnd: string;
  paddingBlockStart: string;
  paddingBlockEnd: string;
};

type Radius = {
  borderRadius: string;
  borderTopLeftRadius: string;
  borderTopRightRadius: string;
  borderBottomLeftRadius: string;
  borderBottomRightRadius: string;
};

type Fill = {
  background: string;
  backgroundColor: string;
  color: string;
  boxShadow: string;
  opacity: string;
  filter: string;
};

type Border = {
  border: string;
  borderWidth: string;
  borderStyle: string;
  borderColor: string;
  borderTopWidth: string;
  borderTopStyle: string;
  borderTopColor: string;
};

type Typography = {
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  fontFamily: string;
  textTransform: string;
  fontFeatureSettings: string;
};

type TextFlow = {
  textAlign: string;
  textDecoration: string;
  textDecorationColor: string;
  textOverflow: string;
  whiteSpace: string;
  overflow: string;
};

type FlexBox = {
  display: string;
  flexDirection: string;
  alignItems: string;
  justifyContent: string;
  flexWrap: string;
  gap: string;
  minWidth: string;
};

type BoxSize = {
  width: string;
  height: string;
  minHeight: string;
  aspectRatio: string;
};

/** 채움·모서리·여백을 variant로 소유하는 표면 컴포넌트 (Card, Surface). */
export type SurfaceSx = StyleXStylesWithout<Spacing & Radius & Fill & Border>;

/** 타이포·색·정렬을 variant로 소유하는 텍스트 컴포넌트 (Text, Chip). */
export type TextSx = StyleXStylesWithout<Typography & TextFlow & Fill & Radius & Spacing>;

/** flex 배치를 variant로 소유하는 레이아웃 컴포넌트 (Stack, HStack, ColorSwatchGroup). */
export type FlexSx = StyleXStylesWithout<FlexBox>;

/** 채움·치수·타이포를 전부 소유하는 컨트롤 (Button, Input, Row, TabBar, Dot, ProgressBar). */
export type ControlSx = StyleXStylesWithout<Spacing & Radius & Fill & Border & Typography & BoxSize & FlexBox>;

/** 셸 슬롯 — 배경·치수·레이아웃을 자기가 정한다 (Screen, AppBar, BottomSheet, Field, Divider). */
export type SlotSx = StyleXStylesWithout<Fill & Border & Radius & FlexBox & BoxSize>;
