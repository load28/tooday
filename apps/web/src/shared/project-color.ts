import type { ProjectColor } from '@tooday/shared';
import type { DotVariantProps } from 'styled-system/recipes';
import { token } from 'styled-system/tokens';

/** 프로젝트 색 이름(계약) → 디자인 토큰 색상값. 프로젝트가 없는 태스크는 gray를 쓴다. */
export const PROJECT_COLOR: Record<ProjectColor, string> = {
  blue: token('colors.brand.500'),
  mint: token('colors.mint.500'),
  violet: token('colors.violet.500'),
  amber: token('colors.amber.500'),
  pink: token('colors.rose.500'),
  gray: token('colors.cool.500'),
};

// 계약: 서버가 주는 ProjectColor는 전부 Dot의 tone(팔레트 색)으로 그대로 렌더된다(부분집합).
// 그래서 <Dot tone={project.color} />가 매핑 없이 넘어간다. 서버/계약이 Dot이 모르는 색을
// 추가하면 이 대입이 컴파일 에러로 드리프트를 한곳에서 잡는다.
type ProjectColorIsDotTone = ProjectColor extends NonNullable<DotVariantProps['tone']> ? true : never;
const _assertProjectColorRenderableByDot: ProjectColorIsDotTone = true;
void _assertProjectColorRenderableByDot;
