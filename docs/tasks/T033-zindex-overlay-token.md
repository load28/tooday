# T033 — z-index 매직넘버를 Panda `overlay` 토큰으로

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-27
- 완료: 2026-07-27

## 배경

`recipes/bottom-sheet.ts`의 포지셔너·백드롭이 `zIndex: 60`을 인라인 매직넘버로 두 곳에
박고 있다. spacing·radii·shadows·durations·easings는 전부 Panda 토큰인데 z-index만
토큰화가 빠졌다(코드베이스 전체에서 z-index 사용처는 이 두 줄뿐 —
`grep -rn zindex src recipes` 확인). 층 이름이 없어 의도가 안 드러나고, 매직넘버라
정합성 관리가 어렵다.

Panda는 `zIndex`를 표준 토큰 카테고리로 지원하며 `zIndex` CSS 속성이 자동 매핑된다 —
레시피에서 `zIndex: 'overlay'`처럼 토큰명으로 참조된다(spacing/radii와 동일).

## 작업 내용

- `panda.config.ts` `theme.tokens`에 `zIndex` 스케일 추가:
  ```ts
  zIndex: { overlay: { value: 60 } }
  ```
- `recipes/bottom-sheet.ts`의 `sheetPositioner`·`sheetBackdrop`에서 `zIndex: 60` →
  `zIndex: 'overlay'`. 둘이 **같은 토큰**을 써서 "한 오버레이 층(표면은 DOM 순서로
  백드롭 위)"이라는 의도를 그대로 표현한다.

**스코프 (YAGNI)**: 현재 z-index 층은 오버레이 하나뿐이다. 오버레이가 하나면 그 위 층은
DOM/스택 순서로 자동으로 쌓이므로, `base/sticky/toast` 같은 스케일을 미리 깔지 않고
**`overlay` 단일 토큰**만 둔다. 둘째 층(드롭다운·토스트 등)이 실제로 생기면 그때 스케일로
넓힌다.

## 완료 기준

- [x] `panda.config.ts`에 `zIndex.overlay` 토큰 존재, 레시피가 `'overlay'` 참조
- [x] 코드베이스에 인라인 z-index 매직넘버 없음
- [x] typecheck 통과(직접 tsc 확인), `panda codegen` 정상(`var(--z-index-overlay)` 생성), 웹 테스트 24 passed, biome 통과

## 대화 기록

> **Minyoung**: 지금 포털방식으로 zindex를 같은 값을주어 스택이 쌓이게 하고 있는데 이것을
> 인라인으로 값을 설정하기보다는 상수를 설정하는것이 좋을듯하다. 한번 찾아보자
>
> **Claude**: (조사) z-index `60`은 `recipes/bottom-sheet.ts` 두 곳에만 있고 panda.config엔
> zIndex 토큰 없음. Panda의 `zIndex` 토큰 카테고리로 `overlay` 토큰을 만들어 참조하는 게
> 정석. 층이 하나뿐이라 단일 토큰 추천(YAGNI).

> **Minyoung**: 그래 그리고 모든 층 스케일은 오버레이 하나면 자동으로 위로 쌓이기 때문에
> 하나만 있어도 될듯하다 … 새로운 태스크로 진행하자
>
> **Claude**: `overlay` 단일 토큰 + 별도 태스크(T033)로 확정.

## 작업 로그

- 2026-07-27: 태스크 생성. `panda.config.ts`에 `zIndex.overlay` 토큰 추가,
  `recipes/bottom-sheet.ts` 두 곳 `zIndex: 60` → `'overlay'`. `background: 'overlay'`
  (colors)와 `zIndex: 'overlay'`(zIndex)는 이름만 같고 카테고리가 달라 충돌 없음.
  styled-system은 gitignored라 커밋 제외(panda codegen이 `var(--z-index-overlay)` 생성 확인).
  검증: 직접 tsc 통과, 웹 테스트 24 passed, biome 클린.
