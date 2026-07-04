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
