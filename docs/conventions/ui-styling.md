# UI 스타일링 — className보다 variant 우선

## 규칙

- `shared/ui` 컴포넌트가 관리하는 속성(padding, tone, size, radius 등)은 반드시 해당
  variant prop으로 지정한다. `sx`로 같은 속성을 덮지 않는다.
- `sx`는 컴포넌트가 다루지 않는 속성에만 쓴다 — 배치·레이아웃(margin, display,
  flex/grid, gap 등)이 대표적이다.
- 필요한 variant가 없으면 사용처에서 덮지 말고 `shared/ui` 컴포넌트에 variant를
  추가한 뒤 쓴다.

## 이유

`sx` override는 **기술적으로는 항상 이긴다** (아래 병합 규칙 참고). 그래서 컴포넌트가
관리하는 속성을 덮으면 조용히 밀리는 대신 **조용히 어긋난다** — variant는 그대로 있는데
화면만 다르고, 두 곳을 다 열어보기 전에는 어느 쪽이 실제 값인지 알 수 없다. variant를
바꿔도 화면이 안 변하는 컴포넌트가 생긴다.

실제 사례(Panda 시절): `Card`는 기본 variant가 `padding: none`인데 사용처에서 padding을
className으로 덮었고, 당시엔 특이도가 동률이라 생성 순서에 따라 카드 안쪽 여백이 통째로
사라졌다. StyleX로 옮긴 지금은 override가 결정적으로 이기지만 — **문제의 원인은 같다.**
같은 속성을 두 곳에서 선언하는 것 자체다.

```tsx
// today-screen.styles.ts
export const styles = stylex.create({
  hero: { marginInline: space.pageX, display: 'flex', gap: space.xl },
});

// ❌ 컴포넌트가 관리하는 속성(padding/color)을 sx로 덮음
<Card sx={styles.cardPadding} />
<Text sx={styles.tertiaryColor} />

// ✅ variant로 지정 — 선언이 한 곳
<Card padding="md" />
<Text tone="tertiary" />

// ✅ sx는 레이아웃 등 variant 밖 속성에만
<Card radius="2xl" padding="lg" sx={styles.hero} />
```

스타일은 tsx에 인라인하지 않고 같은 폴더의 `*.styles.ts`에 `stylex.create`로 두고 import
한다. 컴포넌트 고유 스타일이 짧으면 그 컴포넌트 파일 최상단에 `stylex.create`를 둬도 된다
(`stylex.create`는 **반드시 모듈 최상단**에서 호출한다 — 함수 안에서는 컴파일되지 않는다).

## 병합 — 레이어가 아니라 인자 순서

StyleX는 속성+조건 하나당 원자 클래스 하나를 컴파일 타임에 만들고, `stylex.props()`가
**겹치는 속성의 지는 클래스를 아예 붙이지 않는다.** 그래서 특이도 싸움도, `@layer`로 승패를
정할 일도 없다.

> "The order in which the styles are defined does not affect the resulting styles, only the
> order in which they are applied to the HTML element."
> — [StyleX, Using styles](https://stylexjs.com/docs/learn/styling-ui/using-styles/)

```
stylex.props(base, tone, size, sx)   // 뒤에 오는 인자가 이긴다
```

관례는 **베이스 먼저, 사용처에서 받은 `sx`를 마지막**이다. `BaseButton` → `Button` →
사용처가 이 순서로 쌓인다.

`vite.config.ts`는 `styleResolution: 'application-order'`를 명시한다 — 축약(`margin`)과
개별(`marginTop`)을 섞어 쓸 때 어느 쪽이 이기는지를 기본값에 맡기지 않기 위해서다.

CSS 레이어는 딱 한 가지 용도로만 남아 있다: `routes/__root.tsx`의
`@layer reset, base, stylex;` 한 줄이 **리셋보다 컴포넌트 스타일이 위**라는 것만 확정한다.
컴포넌트끼리의 승패에는 관여하지 않는다.

## 덮을 수 있는 속성을 타입으로 좁힌다

"variant로만 덮어라"는 문서 규약이 아니라 타입으로 강제할 수 있다. `sx`의 타입을 좁히면
컴포넌트가 관리하는 속성을 넘길 때 컴파일 에러가 난다.

```tsx
sx?: StyleXStyles<{ margin?: string; marginTop?: string; flex?: string }>;
```

> "any key not defined in the object type will be disallowed"
> — [StyleX, StyleXStyles](https://stylexjs.com/docs/api/types/StyleXStyles/)

## 자손 스타일 — 변수로 내려보낸다

StyleX는 자손 셀렉터(`.parent > *`, `[data-state="on"] &`)를 지원하지 않는다. 조상 상태에
따라 자손을 바꿔야 하면 **조상이 변수 값을 바꾸고 자손이 그 변수를 읽는다**
([Variables for descendant styles](https://stylexjs.com/docs/learn/recipes/descendant-styles)).
공용 변수는 `styles/slots.stylex.ts`에 모은다.

```tsx
// 조상 — 선택 상태를 변수로 내려보낸다
item: { [swatch.indicatorOpacity]: { default: '0', ':is([data-state="on"])': '1' } }
// 자손 — 변수를 읽기만 한다
indicator: { opacity: swatch.indicatorOpacity }
```

임의의 자식 전체를 대상으로 해야 하는 경우(`Screen.Overlay > *`)만 `app/global.css`에
데이터 속성 셀렉터 한 줄로 둔다.

## asChild — 자식에는 배치만

`BaseButton`/`Button`은 `asChild`로 스타일을 다른 엘리먼트(예: `<Link>`)에 입힐 수 있다
(Ark factory). 이때 부모 스타일과 자식 스타일이 **한 엘리먼트에 함께** 얹히므로, 자식이
variant 관리 속성을 덮으면 위와 같은 이중 선언이 asChild 경계에서 재현된다.

규칙: **색·크기·모서리·여백 = 부모 variant prop. 자식 `sx` = 배치(margin/flex/position)만.**

## 토큰

- `styles/tokens.stylex.ts` — `defineVars`로 선언하는 디자인 토큰(color/space/size/radii/
  shadow/anim/tracking/font/layer). 스타일은 리터럴이 아니라 여기만 참조한다.
- `styles/text.styles.ts` — 타이포 스케일. `stylex.create` 안에서는 객체 스프레드가 금지라
  `...textStyles.body` 대신 `stylex.props(text.body, ...)`로 합친다.
- `defineVars`는 **`.stylex.ts` 파일에서만** 선언할 수 있고 그 파일은 변수 선언 전용이다
  ([Defining variables](https://stylexjs.com/docs/learn/theming/defining-variables/)).
