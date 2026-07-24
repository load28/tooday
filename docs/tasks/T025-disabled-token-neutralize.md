# T025 — 비활성(disabled) 룩을 opacity에서 전용 중립 토큰으로 교체

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-24
- 완료: 2026-07-24
- 커밋: (아래 작업 로그)

## 배경

버튼·인풋의 비활성 상태를 `opacity: 0.5`로 처리한다:

- `apps/web/recipes/base-button.ts:26` — `'&:disabled': { cursor: 'not-allowed', opacity: 0.5 }`
- `apps/web/recipes/input.ts:16` — `_disabled: { cursor: 'not-allowed', opacity: 0.5 }`

이 방식은 Bootstrap·Chakra 계열의 흔한 패턴이지만, 토큰 기반 엔터프라이즈
디자인 시스템(Material 3·Ant·Carbon·Fluent·Polaris)은 비활성을 **전용 중립 회색
토큰**으로 collapse 한다. opacity 방식의 문제:

1. 활성 브랜드색이 흐려질 뿐 유지되어, 이 시스템의 `brandSoft`(활성 밝은 파랑,
   `apps/web/src/shared/ui/button.tsx:23`)와 시각적으로 혼동된다 — "누를 수 없음"이
   색으로 명확히 전달되지 않는다.
2. opacity는 자식 트리 전체를 흐리고 뒤 배경과 합성되어 색 있는 표면 위에서 달라진다.
3. 텍스트 대비가 통제 불가능하게 떨어진다.

semanticTokens에 전용 disabled 토큰이 없다(`apps/web/panda.config.ts:252~291`) —
`cool.*` 회색 램프는 있으므로 그것으로 토큰을 만든다.

## 작업 내용

1. `panda.config.ts` semanticTokens.colors에 추가:
   - `disabledSurface: '{colors.cool.100}'` — 채움 버튼/인풋의 비활성 배경
   - `disabledText: '{colors.cool.400}'` — 비활성 라벨·아이콘
2. `button.tsx`의 cva(utilities 층)에서 `&:disabled`를 중립 토큰으로 지정 —
   baseButton(recipes 층)의 opacity를 결정적으로 덮는다(`opacity: 1`로 되돌리고
   `bg: disabledSurface, color: disabledText`). tone 무관하게 동일 회색으로 collapse.
   채움 없는 tone(ghost·brandGhost)만 `&:disabled { bg: transparent }`로 텍스트만 회색.
3. `input.ts`의 `_disabled`를 opacity에서 `bg: disabledSurface, color: disabledText`로 교체.
4. base-button.ts의 opacity fallback은 **남긴다** — 색 배경이 없는 base 파생(스와치·탭)에는
   opacity 감광이 오히려 적절하다(합성 문제 없음). Button/Input만 토큰화한다.

### 기각한 대안

- base-button.ts에서 opacity 제거: 스와치·탭 등 tone 없는 base 파생의 비활성 감광이
  사라진다. 범위를 Button/Input로 한정하는 게 안전하고 레이어 철학(base=계약,
  overlay=룩)에도 맞는다.
- 컨테이너/라벨 불투명도 분리(Material식 12%/38%): 이 앱 규모엔 과하다. 단색 토큰으로 충분.

## 완료 기준

- [ ] disabled 버튼이 흐린 파랑이 아니라 중립 회색으로 렌더된다 (login/signup/new-task 스샷)
- [ ] enabled brand 버튼과 disabled 버튼이 색으로 명확히 구분된다
- [ ] `bun run typecheck` 통과
- [ ] `bun run check`(Biome) 통과
- [ ] before/after 스크린샷 비교

## 대화 기록

> **사용자**: 귱금한게 버튼이 비활성화 된 디자인이 실제 엔터프라이즈 디자인시스템과 같으누방식이야? 평가해뵈
>
> **Claude**: (평가) opacity 0.5 방식은 흔하지만 성숙한 엔터프라이즈 DS 다수(Material3·Ant·Carbon·Fluent·Polaris)는 전용 중립 회색 토큰으로 처리한다. 이 앱은 brandSoft(활성 밝은 파랑)와 disabled brand(0.5 opacity 흐린 파랑)가 혼동되는 리스크가 있다. loading≠disabled 분리(aria-disabled)와 레이어링은 오히려 잘 돼 있다.
>
> **사용자**: 그럼 오퍼시티말고 뭘로해야해?
>
> **Claude**: 전용 disabled 시맨틱 토큰(중립 회색)으로 색을 명시 교체. tone 무관 collapse, 채움/텍스트 버튼 분기, input recipe도 동일 적용.
>
> **사용자**: 그럼 이렇게 변경을해보고 스샷을 보여줘

## 엔터프라이즈 disabled 토큰 조사 (2차 개선 근거)

1차(cool.100 채움)가 page bg(#f5f6f8)와 대비 1.02:1로 배경에 묻힌다는 피드백을 받아
실제 디자인 시스템의 disabled 값을 조사했다. 두 계열로 갈린다:

| 시스템 | disabled 채움 | disabled 텍스트 | 테두리 |
| --- | --- | --- | --- |
| IBM Carbon (White) | `button-disabled` = `#c6c6c6` (gray-30, **중간 회색**) | `text-on-color-disabled` = `#8d8d8d` | 없음(테두리 없는 버튼) |
| Microsoft Fluent 2 | `colorNeutralBackgroundDisabled` = grey94 `#f0f0f0` (밝음) | grey74 `#bdbdbd` | `colorNeutralStrokeDisabled` = grey88 `#e0e0e0` **있음** |
| Ant Design v5 | `colorBgContainerDisabled` = `rgba(0,0,0,0.04)` (밝음) | `colorTextDisabled` = `rgba(0,0,0,0.25)` (#bfbfbf) | `colorBorder` `#d9d9d9` **있음** |
| Material 3 (Filled) | container = on-surface @ **12%** (subtle) | label = on-surface @ **38%** (또렷) | 없음 |

**핵심 규칙**: *밝은 채움을 쓰는 시스템(Fluent·Ant)은 반드시 테두리로 배경과 분리*하고,
*테두리를 안 쓰는 시스템(Carbon)은 중간 회색(gray-30) 채움*으로 경계를 만든다.
Material은 채움이 옅은 대신 라벨을 38%로 또렷하게 해 "버튼이 여기 있다"를 라벨이 전달한다.

이 앱의 버튼은 **테두리 없는 채움**(Toss식)이므로 Carbon 계열(중간 회색 채움)을 택한다.
Toss 그레이스케일(cool.*)에서 Carbon gray-30(#c6c6c6)에 가장 근접한 채움은
cool.300(#d1d6db)이다. 대비 측정(page bg #f5f6f8 대상):

- cool.100 #f2f4f6 → 1.02:1 (묻힘, 1차)
- cool.200 #e5e8eb → 1.14:1
- **cool.300 #d1d6db → 1.35:1** (채택 — 또렷한 경계)
- cool.400 #b0b8c1 → 1.85:1 (더 강하나 '활성 secondary'처럼 무거워 기각)

라벨: cool.400(#b0b8c1)은 cool.300 위 1.37:1로 안 읽힌다 → **cool.600(#6b7684)**로
올려 채움 위 3.15:1(비텍스트 UI 3:1 기준 충족, Material 38% 라벨의 또렷함 철학과 일치).

**출처:**
- [Best Practice] IBM Carbon Design System — Color tokens: `button-disabled`(gray-30 #c6c6c6), `text-on-color-disabled`(gray-50 #8d8d8d) (`@carbon/themes` White theme)
- [Best Practice] Microsoft Fluent 2 — Web alias color tokens: `colorNeutralBackgroundDisabled`=grey94(#f0f0f0), `colorNeutralStrokeDisabled`=grey88(#e0e0e0), `colorNeutralForegroundDisabled`=grey74(#bdbdbd) (fluentui `packages/tokens` global colors)
- [Best Practice] Ant Design v5 — Alias tokens `colorBgContainerDisabled`(rgba(0,0,0,0.04)), `colorTextDisabled`(rgba(0,0,0,0.25))
- [Best Practice] Material Design 3 — Filled button disabled: container on-surface @12%, label on-surface @38%
- [Standard] W3C WCAG 2.2 — 1.4.11 Non-text Contrast(3:1 기준); 1.4.3 disabled(inactive) 컴포넌트는 대비 예외

## 작업 로그

- 2026-07-24: `disabledSurface`/`disabledText` 시맨틱 토큰 추가(panda.config.ts),
  button.tsx cva·input.ts recipe의 비활성 처리를 opacity 0.5 → 중립 토큰으로 교체.
  base-button.ts opacity fallback은 tone 없는 base 파생용으로 유지.
  검증: `panda codegen` 재생성, `bun run typecheck` 통과, `bun run check`(Biome) 통과.
  실서버(web:3000 + bff:3002)를 띄워 Playwright로 login/signup/new-task의 비활성·활성
  버튼 before/after 스크린샷 캡처 — 비활성이 흐린 파랑에서 중립 회색으로 바뀌고
  활성 브랜드 블루와 명확히 구분됨을 확인. (커밋 788aa62)
- 2026-07-24: 피드백("회색이 배경과 구분이 약함") 반영. 엔터프라이즈 disabled 토큰
  조사(위 섹션) 후 채움 cool.100→cool.300(#d1d6db, 경계 1.02→1.35:1),
  라벨 cool.400→cool.600(#6b7684, 채움 위 1.37→3.15:1)로 리튠. panda.config 토큰 값만
  변경(button/input recipe는 토큰 참조라 무변경). `panda codegen`, typecheck, Biome 통과.
  after2 스크린샷으로 배경 대비 개선 확인. (커밋 5d53534)
- 2026-07-24: 2차 피드백("외부(Carbon) 명도에 맞추지 말고 이 시스템 컬러로 도출하라") 반영.
  이 시스템 표면은 surfaceSoft(cool.100)에서 끝나 전부 밝음 → 채움만으로는 page bg 위 경계 불가.
  각 토큰을 본래 역할대로 재도출(Fluent/Ant식 '밝은 표면+테두리', 이 앱 인풋의 경계 방식과 동일):
  disabledSurface cool.300→cool.100(표면), disabledBorder cool.300 신설(경계),
  disabledText cool.600→cool.500(저강조 라벨). 경계는 button/input recipe의 &:disabled에
  `boxShadow: inset 0 0 0 1px {colors.disabledBorder}`로 그려 테두리 없는 box 모델을 유지.
  ghost·brandGhost는 배경·경계 없이 텍스트만. `panda codegen`, typecheck, Biome 통과.
  after3 스크린샷 — 비활성 버튼이 위 입력 필드와 같은 경계(밝은 표면+얇은 테두리)로 정합됨을 확인.
