import * as z from 'zod';

// 검증 문구 폴백. 각 화면이 FormMessages로 자기 문구를 소유하고,
// 화면이 지정하지 않은 에러만 ko locale 기본 문구로 표시된다.
z.config(z.locales.ko());
