// 생성된 valibot 스키마(apps/bff-rs 코드젠 산출물)가 손수 작성한 계약 스키마와
// **동작상 동일**함을 증명한다. 같은 입력에 대해 safeParse의 성공 여부와 출력이
// 정확히 일치해야 한다 — 이것이 "Rust 계약을 단일 진실로" 삼는 근거다.
//
// 이 테스트가 깨지면 (a) 손수 스키마를 바꿨는데 Rust 계약을 안 바꿨거나
// (b) 코드젠 이미터에 버그가 있는 것이다.

import { describe, expect, test } from 'bun:test';
import * as v from 'valibot';
import * as gen from './generated/index.gen';
import * as hand from './index';

type SchemaName = keyof typeof hand & keyof typeof gen;

// 네임스페이스 임포트를 레코드로 별칭 — 이름으로 스키마를 반사 조회한다.
const handSchemas = hand as unknown as Record<string, v.GenericSchema>;
const genSchemas = gen as unknown as Record<string, v.GenericSchema>;

/** 각 스키마에 먹일 입력 표 — 유효/무효를 섞는다. */
const CASES: Partial<Record<SchemaName, unknown[]>> = {
  taskStatusSchema: ['todo', 'doing', 'done', 'archived', 42, null],
  projectColorSchema: ['blue', 'gray', 'chartreuse', ''],
  projectSchema: [
    { id: 'p1', name: 'Work', color: 'blue' },
    { id: 'p1', name: 'Work', color: 'neon' }, // bad color
    { id: 'p1', name: 'Work' }, // missing color
    { id: 'p1', name: 'Work', color: 'blue', extra: 'stripped' }, // unknown key
  ],
  taskSchema: [
    {
      id: 't1',
      projectId: null,
      title: 'x',
      date: '2026-07-30',
      startAt: '09:30',
      durationMin: 30,
      status: 'todo',
      version: 1,
    },
    // bad date
    { id: 't1', projectId: null, title: 'x', date: '2026-13-40', startAt: '09:30', durationMin: 30, status: 'todo', version: 1 },
    // durationMin < 1
    { id: 't1', projectId: null, title: 'x', date: '2026-07-30', startAt: '09:30', durationMin: 0, status: 'todo', version: 1 },
    // non-integer version
    { id: 't1', projectId: null, title: 'x', date: '2026-07-30', startAt: '09:30', durationMin: 5, status: 'todo', version: 1.5 },
  ],
  createTaskRequestSchema: [
    { title: 'buy milk', date: '2026-07-30', startAt: '09:30', durationMin: 30 },
    { title: '  trimmed  ', date: '2026-07-30', startAt: '00:00', durationMin: 1 }, // trim + default projectId
    { title: '   ', date: '2026-07-30', startAt: '09:30', durationMin: 30 }, // blank after trim
    { title: 'x', date: '2026-07-30', startAt: '25:61', durationMin: 30 }, // bad time
    { title: 'x', projectId: 'p1', date: '2026-07-30', startAt: '09:30', durationMin: 30 },
  ],
  taskPatchSchema: [
    {},
    { status: 'done' },
    { title: 'renamed', projectId: null },
    { durationMin: -3 }, // invalid
    { date: '2026-02-30' }, // bad day for iso check
  ],
  updateTaskRequestSchema: [
    { id: 't1', patch: { status: 'done' } },
    { id: 't1', patch: {} }, // check: at least one field
    { id: 't1', patch: { title: 'x' } },
    { id: 't1' }, // missing patch
  ],
  taskChangeSchema: [
    {
      id: 't1',
      projectId: null,
      title: 'x',
      date: '2026-07-30',
      startAt: '09:30',
      durationMin: 30,
      status: 'todo',
      version: 1,
      syncSeq: 5,
      deleted: false,
    },
    // missing spread-in field (version)
    {
      id: 't1',
      projectId: null,
      title: 'x',
      date: '2026-07-30',
      startAt: '09:30',
      durationMin: 30,
      status: 'todo',
      syncSeq: 5,
      deleted: false,
    },
  ],
  projectSummarySchema: [
    { id: 'p1', name: 'Work', color: 'blue', totalCount: 3, doneCount: 1 },
    { id: 'p1', name: 'Work', color: 'blue', totalCount: -1, doneCount: 1 }, // negative
  ],
  signupRequestSchema: [
    { email: 'a@b.com', password: '12345678', name: 'Kim' },
    { email: 'a@b.com', password: '1234567', name: 'Kim' }, // too short (MIN_PASSWORD_LENGTH)
    { email: 'not-email', password: '12345678', name: 'Kim' },
    { email: '  a@b.com  ', password: '12345678', name: '  Kim  ' }, // trim
  ],
  loginRequestSchema: [
    { email: 'a@b.com', password: 'p' },
    { email: '', password: 'p' },
    { email: 'a@b.com', password: '' },
  ],
  tokenPairSchema: [{ accessToken: 'a', refreshToken: 'r' }, { accessToken: 'a' }],
  authResponseSchema: [
    { user: { id: 'u1', email: 'a@b.com', name: 'Kim' }, accessToken: 'a', refreshToken: 'r' },
    { user: { id: 'u1', email: 'a@b.com', name: 'Kim' }, accessToken: 'a' }, // missing refreshToken (spread)
  ],
  refreshRequestSchema: [{}, { refreshToken: 'r' }, { refreshToken: 42 }],
  refreshResponseSchema: [{ accessToken: 'a', refreshToken: 'r' }, {}],
  meResponseSchema: [{ user: null }, { user: { id: 'u1', email: 'a@b.com', name: 'Kim' } }, { user: { id: 'u1' } }],
  userSchema: [
    { id: 'u1', email: 'a@b.com', name: 'Kim' },
    { id: 'u1', email: 'a@b.com' },
  ],
  appConfigResponseSchema: [
    { version: '1.0.0', minSupportedAppVersion: '1.0.0', features: { projects: true, timeline: false } },
    { version: '1.0.0', minSupportedAppVersion: '1.0.0', features: { projects: true } }, // missing nested field
  ],
  createProjectRequestSchema: [
    { name: 'Work', color: 'blue' },
    { name: '  ', color: 'blue' }, // blank name
    { name: 'Work', color: 'neon' },
  ],
};

describe('generated schemas ≡ hand-written schemas', () => {
  for (const [name, inputs] of Object.entries(CASES) as [SchemaName, unknown[]][]) {
    test(name, () => {
      const handSchema = handSchemas[name];
      const genSchema = genSchemas[name];
      if (!handSchema) throw new Error(`${name} missing from hand-written index`);
      if (!genSchema) throw new Error(`${name} missing from generated index`);

      for (const input of inputs) {
        const h = v.safeParse(handSchema, input);
        const g = v.safeParse(genSchema, input);
        expect(g.success, `success mismatch for input ${JSON.stringify(input)}`).toBe(h.success);
        if (h.success && g.success) {
          expect(g.output, `output mismatch for input ${JSON.stringify(input)}`).toEqual(h.output);
        }
      }
    });
  }
});

describe('generated barrel exposes the full contract surface', () => {
  test('every hand-written valibot schema/const has a generated twin', () => {
    // api.ts (TRPC_ENDPOINT, ApiError) is a plain interface/const, not a valibot
    // schema, so it is intentionally not generated.
    const notGenerated = new Set(['TRPC_ENDPOINT']);
    const missing = Object.keys(hand).filter((k) => !notGenerated.has(k) && !(k in gen));
    expect(missing).toEqual([]);
  });
});
