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

## 작업 로그

- 2026-07-24: `disabledSurface`/`disabledText` 시맨틱 토큰 추가(panda.config.ts),
  button.tsx cva·input.ts recipe의 비활성 처리를 opacity 0.5 → 중립 토큰으로 교체.
  base-button.ts opacity fallback은 tone 없는 base 파생용으로 유지.
  검증: `panda codegen` 재생성, `bun run typecheck` 통과, `bun run check`(Biome) 통과.
  실서버(web:3000 + bff:3002)를 띄워 Playwright로 login/signup/new-task의 비활성·활성
  버튼 before/after 스크린샷 캡처 — 비활성이 흐린 파랑에서 중립 회색으로 바뀌고
  활성 브랜드 블루와 명확히 구분됨을 확인.
