import * as z from 'zod';

// 사용자향 검증 문구는 웹(프레젠테이션)이 전역 error map으로 소유한다.
// 스키마(@tooday/shared)는 규칙만 정의한다 — docs/research/2026-07-04-validation-message-separation.md
// 다국어 도입 시 이 파일이 locale 교체 지점이 된다(사용자 locale에 따라 zod/v4/locales/* 동적 로드).
z.config({
  ...z.locales.ko(),
  customError: (issue) => {
    if (issue.code === 'invalid_format' && issue.format === 'email') {
      return '올바른 이메일을 입력해 주세요.';
    }
    if (issue.code === 'too_small' && issue.origin === 'string') {
      const minimum = Number(issue.minimum);
      return minimum <= 1 ? '필수 입력 항목입니다.' : `${minimum}자 이상 입력해 주세요.`;
    }
    // 나머지는 ko locale 기본 문구로 폴백
    return undefined;
  },
});
