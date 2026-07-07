# UI 스타일링 — className보다 variant 우선

## 규칙

- `shared/ui` 컴포넌트가 recipe로 관리하는 속성(padding, tone, size, radius 등)은
  반드시 해당 variant prop으로 지정한다. `css()` className으로 같은 속성을 덮지 않는다.
- className은 recipe가 다루지 않는 속성에만 쓴다 — 배치·레이아웃(margin, display,
  flex/grid, gap 등)이 대표적이다.
- 필요한 variant가 없으면 사용처에서 css로 덮지 말고 `shared/ui` 컴포넌트에
  variant를 추가한 뒤 쓴다.

## 이유

Panda의 원자 클래스는 특이도가 전부 같아서, 같은 속성이 recipe와 className 양쪽에서
나오면 **스타일시트 생성 순서**가 승패를 가른다. 어느 쪽이 이길지는 코드에서 보이지
않고, 밀린 쪽은 조용히 사라진다.

실제 사례: `Card`는 기본 variant가 `padding: none`(→ `p_0`)인데, 사용처에서
`css({ padding: '14px 16px' })`를 className으로 덮자 `p_0`이 이겨 카드 안쪽 여백이
통째로 사라졌다. 색도 동일하다 — `Text`의 tone 클래스와 className의 `color`가
충돌하면 어느 쪽이 적용될지 보장이 없다.

```tsx
// ❌ recipe가 관리하는 속성을 className으로 덮음 — 생성 순서에 따라 밀린다
<Card className={css({ padding: '14px 16px' })} />
<Text className={css({ color: 'textTertiary' })} />

// ✅ variant로 지정 — 충돌 자체가 없다
<Card padding="md" />
<Text tone="tertiary" />

// ✅ className은 레이아웃 등 recipe 밖 속성에만
<Card padding="lg" className={css({ margin: '4px 16px 16px', display: 'flex', gap: 'xl' })} />
```

## config recipe로 override를 결정적으로 (`@layer` 활용)

`cva`(atomic recipe)는 `@layer utilities`에 깔린다. 사용처 `css()` override도 같은
utilities 층 → 특이도가 같아 **생성 순서**가 승패를 가른다(위 사고). 반면
`panda.config.ts`의 **config recipe**(`defineRecipe`)는 `@layer recipes`에 깔린다.
레이어 우선순위가 `recipes < utilities`라, override(utilities)가 **항상 예측 가능하게
이긴다** — "조용히 밀리거나 순서에 좌우"되는 비결정성이 사라진다.

그래서 override·`asChild` 대상이 되는 토대 프리미티브는 config recipe로 둔다.
현재 `Pressable`이 이 방식이다(`panda.config.ts`의 `recipes.pressable`). 단, 이것은
override를 *결정적으로* 만들 뿐 *권장하는 것은 아니다* — 위의 "variant 우선" 규칙은 그대로다.

> 모든 프리미티브를 config recipe로 옮길 필요는 없다. variant가 있고 override/asChild
> 대상이 되는 것(Pressable/Button, 필요 시 Card·Chip·Text)만 승격하고, 레이아웃 프리미티브
> (Stack·Row·Screen 등)는 콜로케이션을 위해 로컬 스타일로 둔다.

## asChild — 자식에는 배치만

`Pressable`/`Button`은 `asChild`로 스타일을 다른 엘리먼트(예: `<Link>`)에 입힐 수 있다
(Ark factory). 이때 부모 recipe와 자식 className이 **한 엘리먼트에 함께** 얹히므로,
자식이 recipe 관리 속성을 덮으면 위와 같은 충돌이 asChild 경계에서 재현된다.

```tsx
// ❌ 자식이 tone/size/색·여백(recipe 관리)을 덮음
<Pressable asChild tone="brand" size="lg">
  <Link className={css({ background: 'surfaceSoft', paddingLeft: 'md' })}>열기</Link>
</Pressable>

// ✅ tone/size는 부모 prop, 자식 className엔 배치(margin/flex 등)만
<Pressable asChild tone="brand" size="lg">
  <Link className={css({ marginTop: 'md' })}>열기</Link>
</Pressable>
```

규칙: **색·크기·모서리·여백 = 부모 variant prop. 자식 className = 배치(margin/flex/position)만.**
`Pressable`이 config recipe(recipes 층)라 자식 override가 이기긴 하지만, 그건 안전망이지
의도가 아니다 — recipe 관리 속성은 자식에서 덮지 않는다.
