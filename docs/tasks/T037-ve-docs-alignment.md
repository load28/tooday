# T037 — vanilla-extract 전환에 맞춰 문서·주석 정합

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-08-02
- 완료: 2026-08-02

## 배경

T036이 `apps/web`의 스타일 시스템을 Panda CSS → vanilla-extract로 이관했지만,
그 시스템을 설명하는 **문서와 주석은 Panda 용어 그대로**다. 코드는 VE인데 문서는
Panda를 지시하므로, 문서를 따라 작성한 코드는 존재하지 않는 API를 부른다.

살아있는(현재를 서술하는) 문서·주석 중 사실과 어긋난 것:

1. `docs/conventions/ui-styling.md` — 문서 전체가 Panda 전제.
   - `css()` className override (VE에 `css()`가 없다 — `style()` + `cx()`)
   - `cva` = `@layer utilities`, config recipe(`defineRecipe`) = `@layer recipes`,
     우선순위 `recipes < utilities` — T036이 레이어 구조를 바꿨다.
     실제는 `reset < base < base-recipe < recipes < 레이어 없음`
     (`apps/web/src/styles/layers.css.ts:3-8`, `routes/__root.tsx:74`).
   - `panda.config.ts의 recipes.baseButton` — 지금은
     `shared/ui/base-button.css.ts`의 `recipe()` + `baseRec()`.
2. `docs/conventions/ui-composition.md` — `utilities 층 cva`, `config recipe`,
   `panda.config의 _on 조건` 등 Panda 명칭 (실제는 `styles/conditions.ts`의 `ON`).
3. `CLAUDE.md` 인덱스 — 두 컨벤션의 한 줄 요약이 `css()`·`utilities 층`을 지목.
4. `README.md` — Stack에 스타일링 계층이 아예 없고, `apps/web/src` 디렉토리 표에
   `styles/`(토큰·레이어·조건 계약)와 `*.css.ts` 콜로케이션 규칙이 빠져 있다.
5. 코드 주석 6곳이 "Panda의 X 대체/이관"으로만 자기를 설명한다 —
   Panda가 저장소에서 사라졌으므로 지금 독자에게는 없는 것과의 비교다.
   `styles/cx.ts:1`, `styles/split.ts:1`, `styles/text-styles.ts:3`,
   `styles/conditions.ts:3`, `styles/theme.css.ts:3`, `shared/ui/screen.css.ts:8`.
6. `docs/tasks/T024`(대기) — 근거가 전부 `panda.config.ts:행번호`라 지금 착수 불가.
   태스크 파일만 읽고 착수 가능해야 한다는 인덱스 규칙 위반 상태.
7. `.pi/memory.md` — "Panda CSS 사용 시" 논리 속성 규칙.
8. 주석 속 **Panda 조건 이름**(`_on`/`_hover`/`_press`/`_disabled`)이 남아
   실제 export 이름(`ON`/`hover`/`press`/`DISABLED`, `styles/conditions.ts`)과 어긋난다.
   `week-strip.css.ts:17`, `project-detail-screen.css.ts:18`, `button.css.ts:9,36`,
   `base-button.css.ts:26`, `button.tsx:84`, `color-swatch.tsx:8`(`cva 오버레이`).
9. **`apps/web/styled-system/`(2.1M) 잔존** — `panda codegen` 산출물. gitignore
   대상이라 커밋엔 없지만 로컬에 남아, Biome이 gitignore를 안 보므로
   `bun run check`가 여기서만 **189 errors**로 실패해 검증 게이트가 무력화돼 있었다.
   소스 참조 0건, `@pandacss/dev`도 제거돼 재생성 경로 없음.

완료 태스크 문서(T008·T009·T014·T025·T027·T033~T036)와
`docs/superpowers/plans/2026-06-03-number-input.md`는 **당시 기록**이므로 손대지 않는다
— 인덱스 규칙 4("완료 태스크는 지우지 않는다, 기록이 곧 이력이다")와 같은 이유다.

## 작업 내용

문서·주석만 바꾸고 **동작 코드는 건드리지 않는다**(주석 텍스트 제외).

- `ui-styling.md`: "variant 우선" 규칙은 그대로 두고, 근거를 VE 캐스케이드로 교체.
  Panda의 "원자 클래스 특이도 동률 → 생성 순서" 서사 대신 VE의
  "무레이어 > 레이어" 규칙과 `rec`/`baseRec` 레이어 배치를 설명한다.
  예제 코드는 `css({...})` → `*.css.ts`의 `style()` + import.
- `ui-composition.md`: `cva/utilities 층` → `recipe()/recipes 레이어`,
  `config recipe` → `baseRec()`(base-recipe 레이어),
  `panda.config의 _on` → `styles/conditions.ts`의 `ON`.
- `CLAUDE.md` 인덱스 두 줄을 새 용어로.
- `README.md`: Stack에 vanilla-extract 한 줄, `apps/web/src` 표에 `styles/` 추가.
- 주석 6곳: "Panda의 대체"가 아니라 **그것이 무엇인지**를 서술.
- `T024`: 근거를 `styles/theme.css.ts`·`text-styles.ts` 등 현재 경로로 재작성.
  발견 자체(letterSpacing 하드코딩·raw hex·중복 토큰)는 VE 이관 후에도 살아있는지
  확인해 남기거나 해소된 항목은 표시한다.
- `.pi/memory.md`: 논리 속성 규칙은 CSS 일반 규칙이므로 Panda 한정 문구만 제거.
- 주석의 Panda 조건 이름을 `conditions.ts`의 실제 export 이름으로 교체.
- 고아 `apps/web/styled-system/` 제거 — 목적(Panda codegen 소비)이 사라졌고
  `bun run check`를 막고 있다.

기각한 대안:
- 완료 태스크 문서까지 VE 용어로 일괄 치환 — 이력이 왜곡된다.
- `styled-system`을 지우는 대신 biome.json에 ignore 추가 — 증상만 가린다.
  다만 Biome이 gitignore를 안 보는 것(`vcs.useIgnoreFile` 미설정)은 별개 이슈로 남는다
  — `.claude/settings.local.json`도 같은 이유로 잡히므로 별도 판단이 필요하다.

## 완료 기준

- [x] 살아있는 문서·주석에 `panda`/`css()`/`cva`/`utilities 층`/`styled-system` 0건
      (완료 태스크 기록·plans 제외)
- [x] `ui-styling.md`의 레이어 설명이 `layers.css.ts`·`__root.tsx`와 일치
- [x] `T024`가 파일만 읽고 착수 가능한 상태(현재 경로·근거)
- [x] 주석의 조건 이름이 `conditions.ts` export와 일치
- [x] 고아 `styled-system/` 제거로 `bun run check`가 다시 게이트 역할을 함
- [x] `bun run typecheck` / `bun run check` / `lint:deps` / test 통과 (주석만 바뀌므로 회귀 없음)

## 대화 기록

> **사용자**: 지금 ve로 변경했는데 문서나 주석이 그에 맞게 적용되지 않았다. 그것을 적용하자
>
> **Claude**: vanilla-extract 마이그레이션에 맞춰 문서·주석을 정리하겠습니다.
> 프로젝트 규칙대로 먼저 README와 태스크 인덱스를 읽고, Panda CSS 잔재를 전부 찾아보겠습니다.
> (조사 결과: 살아있는 문서 4개 + 주석 6곳 + 대기 태스크 T024 + .pi/memory.md가
> Panda 전제. 완료 태스크 문서는 이력이므로 제외.)

## 작업 로그

- 2026-08-02: 조사 — `panda`/`css()`/`cva`/`utilities` 전수 grep으로 대상 분류
  (살아있는 문서 vs 이력 문서). T036 이후 실제 레이어 구조를 `layers.css.ts`·
  `__root.tsx:74`·`base-button.css.ts`·`button.css.ts`에서 확인.
- 2026-08-02: 문서 5개(README·CLAUDE 인덱스·ui-styling·ui-composition·T024)와
  주석 12곳, `.pi/memory.md` 갱신. `ui-styling.md`는 "생성 순서가 승패를 가른다"는
  Panda 근거가 VE에선 거짓이라 규칙은 유지하고 **이유를 통째로 다시 썼다** —
  이제 override는 항상 이기므로 위험은 "조용히 밀림"이 아니라 "조용히 어긋남"이다.
- 2026-08-02: 검증 중 `bun run check`가 189 errors로 실패 — 전부 고아
  `apps/web/styled-system/`(2.1M)에서 나왔다. 참조·재생성 경로 0을 확인하고 제거.
  이후 tracked 파일 203개 전부 통과(남은 1건은 gitignore된 로컬
  `.claude/settings.local.json` 포맷으로, 저장소 밖 파일이라 손대지 않음).
  검증: `bun run typecheck` 4/4 성공, `lint:deps` 위반 0, web test 24 passed.
