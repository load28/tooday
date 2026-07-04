import * as z from 'zod';

type ValidationIssue = z.core.$ZodRawIssue;

// 사용자향 검증 문구 규칙. 키는 zod issue code(타입으로 강제되어 오타는 컴파일 에러),
// 핸들러는 해당 code의 issue로 좁혀진 타입을 받는다. undefined를 반환하면 ko locale 기본 문구로 폴백.
// 새 문구가 필요하면 여기에 code 키와 핸들러를 추가한다.
const messageByCode: {
  [Code in ValidationIssue['code']]?: (issue: Extract<ValidationIssue, { code: Code }>) => string | undefined;
} = {
  invalid_format: (issue) => (issue.format === 'email' ? '올바른 이메일을 입력해 주세요.' : undefined),
  too_small: (issue) => {
    if (issue.origin !== 'string') return undefined;
    const minimum = Number(issue.minimum);
    return minimum <= 1 ? '필수 입력 항목입니다.' : `${minimum}자 이상 입력해 주세요.`;
  },
};

// 검증 문구는 웹(프레젠테이션)이 소유한다. 스키마(@tooday/shared)는 규칙만 정의한다.
// 다국어 도입 시 이 파일이 locale 교체 지점 — docs/research/2026-07-04-validation-message-separation.md
z.config({
  ...z.locales.ko(),
  // 매핑 타입 키와 유니언 멤버의 상관관계를 TS가 추적하지 못해 핸들러 호출만 캐스팅한다
  customError: (issue) => messageByCode[issue.code]?.(issue as never),
});
