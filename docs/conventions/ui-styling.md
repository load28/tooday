# UI 스타일링 — className보다 variant 우선

## 규칙

- `shared/ui` 컴포넌트가 recipe로 관리하는 속성(padding, tone, size, radius 등)은
  반드시 해당 variant prop으로 지정한다. className으로 같은 속성을 덮지 않는다.
- className은 recipe가 다루지 않는 속성에만 쓴다 — 배치·레이아웃(margin, display,
  flex/grid, gap 등)이 대표적이다.
- 필요한 variant가 없으면 사용처에서 덮지 말고 `shared/ui` 컴포넌트에
  variant를 추가한 뒤 쓴다.

## 이유

className override는 **기술적으로는 항상 이긴다** (아래 캐스케이드 참고). 그래서
recipe가 관리하는 속성을 덮으면 조용히 밀리는 대신 **조용히 어긋난다** — recipe의
variant는 그대로 있는데 화면만 다르고, 두 곳을 다 열어보기 전에는 어느 쪽이 실제
값인지 알 수 없다. variant를 바꿔도 화면이 안 변하는 컴포넌트가 생긴다.

실제 사례(Panda 시절): `Card`는 기본 variant가 `padding: none`인데 사용처에서
padding을 className으로 덮었고, 당시엔 특이도가 동률이라 생성 순서에 따라 카드
안쪽 여백이 통째로 사라졌다. VE로 옮긴 지금은 override가 이기지만 — **문제의 원인은
같다.** 같은 속성을 두 곳에서 선언하는 것 자체다.

```tsx
// today-screen.css.ts
export const heroCls = style({ marginInline: vars.space.pageX, display: 'flex', gap: vars.space.xl });

// ❌ recipe가 관리하는 속성(padding/color)을 className으로 덮음
<Card className={style({ padding: '14px 16px' })} />
<Text className={style({ color: vars.color.textTertiary })} />

// ✅ variant로 지정 — 선언이 한 곳
<Card padding="md" />
<Text tone="tertiary" />

// ✅ className은 레이아웃 등 recipe 밖 속성에만
<Card radius="2xl" padding="lg" className={heroCls} />
```

스타일 상수는 tsx에 인라인하지 않고 같은 폴더의 `*.css.ts`에 두고 import 한다
(`style()`은 빌드타임에 평가되므로 `.css.ts`에서만 호출할 수 있다).

## 캐스케이드 — 레이어로 override를 결정적으로

vanilla-extract에는 특이도 조작이 없다. 대신 **CSS `@layer` 순서**가 승패를
결정한다. `apps/web/src/styles/layers.css.ts`가 두 헬퍼를 노출하고,
순서는 `routes/__root.tsx`의 `<style>{'@layer reset, base, base-recipe, recipes;'}</style>`
한 줄이 확정한다.

```
reset(preflight) < base(globalStyle) < base-recipe < recipes < 레이어 없음
```

- `baseRec(...)` — **base-recipe 레이어.** 다른 recipe에 `cx`로 합성돼 덮이는
  베이스용. 현재 `baseButton` 하나.
- `rec(...)` — **recipes 레이어.** 나머지 모든 컴포넌트 recipe
  (card·text·buttonStyle·swatchItem·…). base-recipe보다 위라 베이스를 결정적으로 덮는다.
- **레이어 없음** — 1회성 `style()`(`heroCls`, feature의 레이아웃 클래스 등).
  "레이어 없는 스타일이 어떤 레이어보다 이긴다"는 CSS 규칙 때문에 recipe를 항상 이긴다.

그래서 `BaseButton`은 리셋·인터랙션만 갖고(base-recipe), 그 위의 시각 스타일
(`Button`의 tone/shape/size, 스와치·탭 오버레이)은 recipes 레이어라 **항상 예측
가능하게** 이긴다. 예: `button.css.ts`의 `&:disabled { opacity: 1 }`이
`base-button.css.ts`의 `&:disabled { opacity: 0.5 }`를 덮어 tone 무관 중립 채움으로
바꾼다 — 순서가 아니라 레이어가 보증한다.

단, 이것은 override를 *결정적으로* 만들 뿐 *권장하는 것은 아니다* — 위의
"variant 우선" 규칙은 그대로다.

> 모든 프리미티브를 base-recipe로 내릴 필요는 없다. 합성돼 덮이는 토대만 `baseRec`,
> 나머지 recipe는 `rec`, 1회성은 무레이어 `style()`. 새 recipe를 만들면서 레이어
> 헬퍼를 빠뜨리면 무레이어가 되어 다른 recipe를 전부 이겨버리므로,
> `recipe()`의 base와 각 variant는 `rec(...)`로 감싼다.

## asChild — 자식에는 배치만

`BaseButton`/`Button`은 `asChild`로 스타일을 다른 엘리먼트(예: `<Link>`)에 입힐 수 있다
(Ark factory). 이때 부모 스타일과 자식 className이 **한 엘리먼트에 함께** 얹히므로,
자식이 variant 관리 속성을 덮으면 위와 같은 이중 선언이 asChild 경계에서 재현된다.

```tsx
// ❌ 자식이 tone/size/색·여백(variant 관리)을 덮음
<Button asChild tone="brand" size="lg">
  <Link className={linkOverrideCls}>열기</Link>  {/* background·paddingLeft */}
</Button>

// ✅ tone/size는 부모 prop, 자식 className엔 배치(margin/flex 등)만
<Button asChild tone="brand" size="lg">
  <Link className={linkSpacingCls}>열기</Link>  {/* marginTop */}
</Button>
```

규칙: **색·크기·모서리·여백 = 부모 variant prop. 자식 className = 배치(margin/flex/position)만.**
자식의 무레이어 `style()`이 부모 recipe를 이기는 건 안전망이지 의도가 아니다 —
variant 관리 속성은 자식에서 덮지 않는다.
