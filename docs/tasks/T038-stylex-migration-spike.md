# T038 — StyleX 전환 타당성 스파이크 (vanilla-extract 대체 검토)

- 상태: 완료 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-09-13
- 완료: 2026-09-13

## 배경

현재 웹 스타일링은 vanilla-extract다 (`apps/web/src` 기준 `*.css.ts` 34개 / 1,412줄,
`recipe()` 43개). override 승패는 CSS `@layer` 순서로 확정하고 있고
(`apps/web/src/styles/layers.css.ts`, `routes/__root.tsx`의 `@layer reset, base, base-recipe, recipes;`),
그 규약이 [docs/conventions/ui-styling.md](../conventions/ui-styling.md)와
[docs/conventions/ui-composition.md](../conventions/ui-composition.md)에 문서화돼 있다.

StyleX(Meta)는 병합 모델이 다르다 — 속성+조건 하나당 원자 클래스 하나를 컴파일 타임에
만들고, `stylex.props()`가 **겹치는 속성의 지는 클래스를 아예 붙이지 않는다.**
그래서 레이어·`cx`·`twMerge` 류가 필요 없다.

조사에서 확인한 공식 근거:

- 병합 결정성 — "The order in which the styles are defined does not affect the resulting
  styles, only the order in which they are applied to the HTML element."
  ([Using styles](https://stylexjs.com/docs/learn/styling-ui/using-styles/))
- 특이도 충돌 없음 — "StyleX automatically manages the specificity of CSS selectors to
  guarantee that there are no collisions between the generated rules."
  ([Introducing StyleX](https://stylexjs.com/blog/introducing-stylex))
- 중복 제거 — "A helper function deduplicates, sorts, and writes the collected styles to a
  CSS file." (동일 문서)
- Ark `data-state` 조상 셀렉터 대체 — `stylex.when.ancestor('[data-state="open"]')`
  ([when API](https://stylexjs.com/docs/api/javascript/when)).
  현재 이 패턴 사용처는 `shared/ui/color-swatch.css.ts:48`,
  `features/today/week-strip.css.ts:50` 두 곳.
- 동적 값 — "Behind the scenes, StyleX generates static styles that depend on a CSS variable
  and sets the value of that variable at runtime."
  ([Defining styles](https://stylexjs.com/docs/learn/styling-ui/defining-styles))
  현재 해당 사례는 `shared/ui/progress-bar.tsx:21`의 `style={{ width }}` 하나.
- `create`는 모듈 최상단 정적 호출이어야 함 — "the compiler needs to know the styles created
  at compile time" ([Discussion #154](https://github.com/facebook/stylex/discussions/154)).
- Vite 공식 통합은 `@stylexjs/unplugin` (`stylex.vite()`를 `@vitejs/plugin-react` **앞에**)
  ([Vite + React](https://stylexjs.com/docs/learn/installation/vite/vite-react/)).

즉 기능적 블로커는 없다. **유일하게 검증되지 않은 것은 이 저장소의 번들러 조합**이다 —
`apps/web`은 rolldown-vite 8 + TanStack Start(Nitro) + `@tanstack/router-plugin`을 쓰고
(`apps/web/vite.config.ts`), 이 조합에서 `@stylexjs/unplugin`이 도는지는 공식 문서·예제에
없다. 여기서 막히면 나머지 이점은 의미가 없으므로 스파이크로 먼저 확인한다.

## 작업 내용

**이 태스크는 전환이 아니라 타당성 확인이다.** 전면 마이그레이션은 결과를 보고 별도
태스크로 연다.

1. `apps/web`에 `@stylexjs/stylex` + `@stylexjs/unplugin` 설치, `vite.config.ts`에
   `stylex.vite({ useCSSLayers: true })`를 `viteReact()` 앞에 배치.
2. 토큰 일부를 `.stylex.ts`로 옮겨 `defineVars` 계약이 서는지 확인 (전체 이관 아님).
3. 컴포넌트 한 세트(`BaseButton` + `Button`)를 StyleX로 재작성 —
   base + tone/shape/size 조합을 **스타일 객체 배열을 돌려주는 함수**로 표현하고,
   사용처 prop을 `className` → `style: StyleXStyles<...>`로 바꾼다.
4. vanilla-extract와 **공존 상태**에서 build / typecheck / test가 통과하는지 본다.

### 결정된 방향

- recipe 추상화 층은 만들지 않는다. 컴포넌트 파일 안에서 배열을 조립한다
  (`[base.root, tones[tone], sizes[size], style]`).
- override 규율은 문서 규약이 아니라 `StyleXStyles<{...}>` 타입으로 강제한다.
- `styleResolution`은 기본값에 기대지 않고 명시한다 — 공식 문서 두 페이지가 기본값을
  다르게 적고 있다 ([babel-plugin](https://stylexjs.com/docs/api/configuration/babel-plugin/)은
  `'application-order'`, [Using styles](https://stylexjs.com/docs/learn/styling-ui/using-styles/)는
  `'property-specificity'`).

### 기각한 대안

- **전면 일괄 전환** — 번들러 조합이 미검증인 상태에서 34파일을 옮기면 실패 시 되돌림
  비용이 크다.
- **VE 유지 + 레이어 규약 보강** — 지금 규약은 동작하지만, 같은 속성을 두 곳에서 선언하는
  문제를 사람이 지켜야 한다는 한계는 남는다.

## 완료 기준

- [x] `@stylexjs/unplugin`이 rolldown-vite 8 + TanStack Start에서 CSS를 방출하는지 (성공/실패 기록)
- [x] `BaseButton` + `Button`이 StyleX로 동작 (tone/shape/size, hover/press/disabled, `asChild`)
- [x] vanilla-extract 공존 상태에서 `bun run build` 통과
- [x] `bun run typecheck` 통과
- [x] `bun run test` (apps/web) 통과 — `shared/ui/button.test.tsx` 포함
- [x] 결과를 이 문서 「작업 로그」에 남기고, 전면 전환 여부 판단 근거를 기록

## 결과 — 전환 가능

번들러 조합이 유일한 미검증 항목이었고, **돈다.** 픽셀 동일성까지 확인했다.

### 성립한 것

- `@stylexjs/unplugin@0.19.0`이 vite 8.0.16(rolldown) + TanStack Start + Nitro에서 동작한다.
  프로덕션 빌드에서 CSS를 `global-*.css` 자산에 덧붙인다(`cssInjectionTarget` 자동 선택).
- 이 저장소가 쓰던 셀렉터가 전부 컴파일된다 —
  `:not(:disabled):hover`(컴파운드), `:is(:focus-visible, [data-focus-visible])`,
  `:is([data-state="on"])`, `@media (hover: hover)` 안에 중첩된 hover.
- `defineVars`(`styles/tokens.stylex.ts`) 토큰이 VE `theme.css.ts`와 **공존**한다.
- 레이어 공존: `@layer reset, base, base-recipe, stylex, recipes;`로 StyleX를 VE recipes 아래
  칸에 놓으면, `week-strip`·`tab-bar`처럼 BaseButton 위에 VE 오버레이를 얹는 기존 컴포넌트가
  그대로 이긴다(실측: 선택된 요일 셀 배경 `rgb(49,130,246)` 유지).
- **픽셀 동일** — `/login`, `/today` 두 화면을 전환 전/후로 캡처해 비교한 결과 차이 0px
  (390×844, 329,160px 전수 비교). 계산된 스타일(높이·여백·radius·타이포·transition)도 일치.

### 전환 시 필요한 배선 (문서에 없거나 이 조합 특유)

1. **`aliases` + `unstable_moduleResolution`** — babel이 `.stylex.ts` 임포트를 디스크에서 직접
   풀기 때문에 tsconfig paths(`@/*`)를 모른다. `vite.config.ts`에 별도로 선언해야 한다.
   빠뜨리면 "Could not resolve the path to the imported file"로 빌드가 죽는다.
2. **dev 모드는 수동 주입** — 기본 `devMode: 'full'`은 `transformIndexHtml`로 주입하는데
   TanStack Start는 index.html이 없어 **아무것도 주입되지 않는다**(빌드는 되는데 화면만 무스타일).
   `devMode: 'css-only'` + `<link rel="stylesheet" href="/virtual:stylex.css" />` +
   `import('virtual:stylex:css-only')`(HMR)를 직접 넣는다 → `app/stylex-dev.tsx`.
3. **`textStyles` 스프레드 불가** — `stylex.create` 안에서 객체 스프레드가 금지라
   `...textStyles.body`를 못 쓴다. 타이포 값을 인라인하거나 토큰으로 승격해야 한다.
   (전면 전환 시 `text-styles.ts`를 어떻게 옮길지가 유일한 설계 숙제.)
4. **`transition` 축약 대신 longhand** — `transitionProperty`/`Duration`/`TimingFunction`으로 쪼갰다.
5. peer 경고 — `@stylexjs/unplugin`은 `unplugin@^2.3.11`을 요구하는데 워크스페이스에 3.0.0이
   올라와 있다. 경고만 나고 동작에는 문제 없었다.

### 관찰 (전면 전환 때 확인할 것)

- 프로덕션에서는 `__root.tsx`의 `@layer …;` 선언문이 스타일시트 링크들보다 **뒤에** 파싱된다.
  실제 순서(reset, base, stylex.priority1‑5, recipes)는 자산 순서로 이미 맞아떨어졌지만,
  선언문이 순서를 강제하고 있는 것은 아니다.
- 전환 후에도 `base-button.css.ts` / `button.css.ts`는 디스크에 남아 있다(임포트가 없어 VE가
  방출하지 않음). 전면 전환에서 제거 대상.

### 판단

전면 전환의 기술적 장애물은 없다. 남은 것은 34개 파일의 손품과 위 3번(타이포 토큰) 설계 하나다.
전면 전환은 별도 태스크로 연다.

## 대화 기록

> **사용자**: stylex로 스타일링을 변경하는것을 고려해봐
>
> **Claude**: (조사 후) 결론 — 기술적으로 가능해졌지만, 지금 전면 교체는 실익 대비 비용이
> 큽니다. 과거 StyleX의 결격 사유(Vite 미지원, Ark `data-state` 조상 셀렉터 불가)는 둘 다
> 공식 해소됐습니다. 남은 문제는 호환성이 아니라 이 저장소가 쌓아둔 recipe·레이어 규약에
> StyleX에는 대응물이 없다는 점입니다. 규모는 34개 파일 / 1,412줄, 컨벤션 문서 2건 개정입니다.
> 전면 교체 전에 `BaseButton` + `Button` + `ColorSwatchGroup` 한 세트만 옮겨 ① rolldown-vite 8 +
> TanStack Start에서 unplugin이 도는가 ② variants 없이 tone/shape/size가 읽히게 표현되는가
> ③ `when.ancestor`가 Ark `asChild` 경계에서 동작하는가를 확인하고 결정할 것을 권합니다.
>
> **사용자**: 그럼 stylex는 이렇게 위에서 병합할때 안정적으로 나중에 덮는 속성이 이기는 방법은? 공식문서나 레퍼런스를 찾아보자
>
> **Claude**: CSS 캐스케이드가 아니라 `stylex.props()` 안에서 원자 클래스를 교체하는 방식이라
> 파일 순서·생성 순서와 무관하게 나중 인자가 이깁니다. 조건은 하나 — 덮을 스타일을
> `className` 문자열이 아니라 StyleX 스타일 객체로 넘겨 한 번의 `props()` 호출에 모아야 합니다.
> (근거: Using styles, Introducing StyleX, babel-plugin `styleResolution`, StyleXStyles 인용)
>
> **사용자**: 말이 어렵네 핵심만 심플하게 정리하자
>
> **Claude**: `stylex.props(A, B)`에서 뒤에 쓴 B가 이깁니다. 속성 하나당 클래스 하나를 만들고
> 겹치면 앞의 클래스를 아예 빼버립니다. 그래서 `@layer`가 필요 없습니다. 지금 코드와의 대응 —
> `rec`/`baseRec` 레이어 → 인자 순서, `cx(cls, className)` → `props(styles, style)`,
> "variant로만 덮어라" 문서 규약 → `StyleXStyles<{...}>` 타입.
>
> **사용자**: 지켜야할것에 클래스가 아니라 스타일 객체여야함다는건 무슨말?
>
> **Claude**: `props()`를 호출하는 순간 스타일 객체가 클래스 문자열로 구워집니다. 구워진 뒤에는
> 병합이 안 됩니다. 부모가 `stylex.props(...).className`을 넘기면 자식 클래스와 둘 다 붙어 다시
> CSS 순서 싸움이 되고, 객체를 그대로 넘겨 자식이 `stylex.props(base, props.style)`로 한 번에
> 구우면 지는 클래스가 빠집니다. 실제로는 `shared/ui`의 prop이 `className: string` →
> `style: StyleXStyles`로 바뀝니다.
>
> **사용자**: 이게 훨씬 깔끔하고 미리 레이어를 구분할필요가 없어 좋네 테일윈드처럼 동작하지만 선언된 스타일객체를 컴파일하면서 미리 클래스를 만드는구나
>
> **Claude**: 맞습니다. 차이는 충돌을 누가 푸느냐입니다 — Tailwind는 둘 다 남기고 CSS 순서가
> 정해서 `tailwind-merge`가 필요하지만, StyleX는 `props()`가 지는 클래스를 아예 안 붙입니다.
>
> **사용자**: 근데 대신 스타일객체로 기존 스타일을 병합한다면 또 새로운 클래스가 만들어지겠네?
>
> **Claude**: 아니요. 클래스는 컴파일 때 이미 다 만들어져 있고 병합은 고르는 일일 뿐입니다.
> CSS는 조합이 아니라 값의 가짓수만큼만 늘어납니다(컴파일러가 중복 제거). 예외는 런타임 값 —
> CSS 변수 + 인라인 style로 나갑니다.
>
> **사용자**: 결국 스타일 객체끼리 병합하면 뒤가 우선시되는 병합이 발생하고 각 속성마다 클래스가 하나씩 붙는거구나
>
> **Claude**: 정확합니다. 한 가지만 덧붙이면 조건도 별개 슬롯입니다 — `background` 기본값과
> `:hover`일 때의 `background`는 각각 클래스를 하나씩 차지합니다. 즉 "속성 × 조건" 하나당
> 클래스 하나이고, 지금 `conditions.ts`의 hover/press/ON 조합이 그대로 이 구조에 얹힙니다.
>
> **사용자**: 근데 동적으로 스타일이 내려가는 경우는?
>
> **Claude**: 값만 CSS 변수로 내려갑니다. 함수 스타일로 쓰면 `class="x_width-var"` +
> `style="--width: 60%"`로 나뉘고 CSS 규칙은 하나입니다. 제약은 함수 본문이 객체 리터럴 하나여야
> 한다는 것. 지금 `progress-bar.tsx:21`이 딱 이 케이스입니다.
>
> **사용자**: 그럼 스타일x로 바꾸는게 무조간 이득이네?
>
> **Claude**: 아니요. recipe/variants API가 없어 43개 recipe를 직접 매핑으로 옮겨야 하고,
> `@stylexjs/unplugin`이 rolldown-vite 8 + TanStack Start에서 도는지 미검증이며, 지금 레이어
> 규약은 이미 동작 중이라 "문제 해결"이 아니라 "더 나은 모델로 이동"입니다.
>
> **사용자**: 레시피는 걍 클래스일뿐 스타일엑스로 다 만들슈있는거 아냐?
>
> **Claude**: 맞습니다, 제가 과장했습니다 — recipe는 그대로 재현됩니다. 변형별 스타일 객체를
> 고르는 함수를 쓰면 되고, `defaultVariants`는 기본 인자, `compoundVariants`는 조건부 원소,
> 타입은 `keyof typeof tones`로 나옵니다. 다른 점은 문자열이 아니라 스타일 객체 배열을
> 돌려준다는 것뿐입니다. 남는 비용은 손품과 번들러 미검증 두 개입니다.
>
> **사용자**: 공통솓성이 필요하면 걍 스타일엑스 객체를 함수로 샹성하면 될문제아님? 그럼 베이스 스타일을 가지고 베리언트에 따라 조건부 스타일을 병합하는거지
>
> **Claude**: 그 방식이 정확히 StyleX가 의도한 형태입니다. 단 `create`는 모듈 최상단에 두고
> 함수는 고르는 역할만 해야 합니다 — 함수 안에서 `create`를 부르는 것은 불가입니다
> (컴파일 타임 정적 분석 + `props()` 메모이제이션 참조 동일성). 값이 진짜 런타임에 정해질 때만
> `create` 안의 함수 스타일을 씁니다.
>
> **사용자**: 버튼이 배열을 반환하는데 이유는?
>
> **Claude**: 배열은 아직 안 합친 상태를 그대로 넘기는 그릇입니다. 합치는 건 `props()`의 일이고,
> 컴파일된 스타일 객체는 불투명해서 헬퍼가 스프레드로 합치면 원자 클래스 교체를 우회합니다.
> 또 `props()`가 falsy를 무시하므로 배열에 조건을 그대로 끼워 넣을 수 있습니다.
>
> **사용자**: 이러면 레이어가 필요없고 레시피도 대체할수있는 스타일엑스가 낫네 굳이 레시피를 맘들지말고
>
> **Claude**: 동의합니다. 컴포넌트 안에서 배열을 조립하면 되니 별도 recipe 추상화 층은 필요
> 없습니다. `layers.css.ts`, `cx.ts`, `split.ts`, `@vanilla-extract/recipes`가 통째로 사라집니다.
> 대신 규율이 `StyleXStyles<{...}>` 타입으로 옮겨갑니다.
>
> **사용자**: 규율자채가 존제한 이유도 레이어단위로 덮게끔 하기위함이였어 근데 테일윈드처럼 사실상 병합되니 문제가 없네
>
> **Claude**: 절반은 맞습니다. 승패 불확실성(Panda 시절 특이도 동률로 Card 여백이 사라진 사고)은
> 사라지지만, 같은 속성을 두 곳에서 선언하는 문제는 남습니다. 문서도 "override를 결정적으로
> 만들 뿐 권장하는 것은 아니다"라고 선을 그어뒀습니다. 규율은 없어지는 게 아니라 문서 규약에서
> 타입 강제로 형태가 바뀝니다.
>
> **사용자**: 마지막 내용이 이해가 안가는데 쉽게 설명해뵈
>
> **Claude**: 지금은 사람이 지켜야 하는 약속이라 밖에서 덮어도 그냥 컴파일됩니다. StyleX에서는
> `style` prop에 허용 속성 목록을 타입으로 적어두면 `padding`을 덮으려 할 때 에디터에 빨간 줄이
> 뜹니다. 같은 규칙인데 지키는 주체가 사람에서 컴파일러로 바뀝니다.
>
> **사용자**: 너무 좋네 오히려
>
> **Claude**: 정리하면 얻는 건 세 가지입니다 — 병합이 한 곳(`props()`)으로 모임, recipe를 별도
> 추상화 없이 대체, 규율의 타입 승격. 남은 건 `@stylexjs/unplugin`이 rolldown-vite 8 +
> TanStack Start에서 도는지 하나뿐입니다.
>
> **사용자**: 너가 그럼 남은것에 대해 테스트를 해봐

## 작업 로그

- 2026-09-13: 태스크 생성. 조사 단계에서 공식 문서 근거 수집 완료 (배경 절 인용 참조).
  현황 실측 — `apps/web/src` `*.css.ts` 34개 / 1,412줄, `recipe()` 43개, `selectors:` 23개,
  조상 셀렉터 2곳, 런타임 동적 스타일 1곳.
- 2026-09-13: 스파이크 실행. `@stylexjs/stylex` + `@stylexjs/unplugin` 0.19.0 설치,
  `vite.config.ts`에 `stylex.vite()` 배선(aliases/unstable_moduleResolution/devMode/useCSSLayers),
  `styles/tokens.stylex.ts`(defineVars 부분 이관), `shared/ui/base-button.tsx` +
  `shared/ui/button.tsx`를 StyleX로 재작성, `app/stylex-dev.tsx`로 dev CSS 주입,
  `routes/__root.tsx` 레이어 선언에 `stylex` 추가.
  검증 — `bun run typecheck` 통과 / `bun run build` 통과 / `bun run test` 24개 통과 /
  `bun run lint:deps` 위반 0 / `bun run check`는 기존 2건(shared/time.ts, shared/i18n/index.ts)만 남음.
  E2E(Playwright, 390×844) — dev·prod(preview) 양쪽에서 `/login`, `/today` 렌더 확인,
  전환 전 스냅샷과 픽셀 차이 0.
