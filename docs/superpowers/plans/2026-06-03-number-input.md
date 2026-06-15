# NumberInput 컴포넌트

**Goal**: `apps/web/src/components/ui/` 에 min/max 범위 제한을 가진 범용 숫자 텍스트 인풋 컴포넌트를 추가한다.

**Architecture**: 기존 UI 컴포넌트와 동일하게 Panda CSS `cva()` recipe + 폴리모픽 없이 `<input type="number">` 고정. controlled/uncontrolled 모두 지원하며, onBlur 시 범위 초과값을 clamp한다. 범위 초과 시 `tone: 'danger'` 자동 적용.

**Tech Stack**: TypeScript, React 19, Panda CSS (cva/cx from styled-system/css)

---

## Tasks

- [x] **1. `number-input.tsx` 파일 생성**
  - Create: `apps/web/src/components/ui/number-input.tsx`
  - Steps:
    1. `cva()` recipe 정의: base 스타일 + `size` / `tone` variants
       - base: `display:block`, `width:100%`, `border: 1px solid {colors.border}`, `borderRadius: md`, `bg: surface`, `outline: none`, focus/disabled/placeholder 조건
       - `size`: `sm`(height: controlSm) / `md`(height: tap, 기본) / `lg`(height: tapLg)
       - `tone`: `default` / `danger`(borderColor: danger, focus shadow: dangerSoft)
    2. 타입 정의
       ```ts
       type NumberInputOwnProps = {
         value?: number;
         defaultValue?: number;
         onChange?: (value: number) => void;
         min?: number;
         max?: number;
         step?: number;          // 기본 1
         size?: 'sm' | 'md' | 'lg';
         tone?: 'default' | 'danger';
         className?: string;
       };
       type NumberInputProps = NumberInputOwnProps &
         Omit<ComponentPropsWithoutRef<'input'>, keyof NumberInputOwnProps | 'type'>;
       ```
    3. 헬퍼 함수 `clamp(value, min, max)`, `isOutOfRange(value, min, max)` 작성
    4. `NumberInput` 함수 컴포넌트 작성
       - controlled: `value !== undefined` 여부로 판별
       - uncontrolled: 내부 `useState<string>` 로 raw 문자열 관리
       - `handleChange`: raw 값 저장, `parseFloat` 성공 시 `onChange` 호출
       - `handleBlur`: 범위 초과 시 clamp 후 `onChange` 호출 및 내부 state 교정
       - `resolvedTone`: 외부 `tone` prop 우선, 없으면 `outOfRange ? 'danger' : 'default'`
       - `<input type="number" inputMode="numeric" ...>` 렌더링
  - Verify:
    ```sh
    cd apps/web && bunx tsc --noEmit
    # 에러 0건
    ```

- [x] **2. `index.ts` export 추가**
  - Modify: `apps/web/src/components/ui/index.ts`
  - Steps:
    1. 기존 export 목록에 한 줄 추가:
       ```ts
       export { NumberInput } from './number-input';
       ```
  - Verify:
    ```sh
    grep "NumberInput" apps/web/src/components/ui/index.ts
    # export { NumberInput } from './number-input';
    ```

- [x] **3. 타입 검사 최종 확인**
  - Steps:
    ```sh
    cd apps/web && bunx tsc --noEmit
    ```
  - 기대 출력: 에러 없음
