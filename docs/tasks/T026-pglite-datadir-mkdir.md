# T026 — PGlite 데이터 디렉토리 부모 미생성으로 BFF 기동 실패

- 상태: 진행중 <!-- 대기 | 진행중 | 완료 -->
- 생성: 2026-07-24
- 완료: -
- 커밋: -

## 배경

`bun install` 직후 `bun dev`로 BFF를 띄우면 PGlite 초기화 중 죽는다.

```
ENOENT: no such file or directory, mkdir '/…/apps/bff/.data/pglite'
  at new m (…/@electric-sql/pglite/dist/fs/nodefs.js:1:277)
  at createPgliteDatabase (apps/bff/src/platform/db/pglite.ts:11:42)
```

- 기본 데이터 경로: `apps/bff/src/platform/config.ts:53` — `pgliteDataDir: env.BFF_PGLITE_DIR ?? '.data/pglite'`.
- PGlite `NodeFS` 생성자는 leaf만 비재귀로 만든다:
  `existsSync(rootDir) || mkdirSync(rootDir)` (재귀 플래그 없음).
- BFF cwd가 `apps/bff`라 대상은 `apps/bff/.data/pglite`. 부모 `.data`는
  `.gitignore`의 `**/.data`로 무시돼 fresh 체크아웃/리셋에는 존재하지 않는다.
- 부모가 없는 상태에서 leaf를 비재귀 mkdir → `ENOENT`. 즉 첫 기동에서 항상 재현된다.

## 작업 내용

`apps/bff/src/platform/db/pglite.ts`의 `createPgliteDatabase`에서, dataDir가 실제
파일 경로일 때만 `fs.mkdirSync(dataDir, { recursive: true })`로 부모까지 만든 뒤
PGlite에 넘긴다. `memory://` 등 프로토콜(`://` 포함) 경로는 건너뛴다.

- 기각한 대안: 수동 `mkdir -p apps/bff/.data`. `.data`가 gitignore라 fresh
  환경마다 재발하는 증상 우회일 뿐이라 채택하지 않는다.

## 완료 기준

- [x] `.data`가 없는 상태에서 BFF가 PGlite 디렉토리를 만들고 정상 기동한다.
- [x] `memory://`(테스트 경로)는 디렉토리를 만들지 않는다.
- [x] typecheck 통과.

## 대화 기록

> **사용자**: (BFF dev 로그 붙여넣음) `ENOENT: no such file or directory, mkdir
> '/Users/seominyong/Downloads/source/tooday/apps/bff/.data/pglite'` … 문제 발생함
>
> **Claude**: 근본 원인은 PGlite `NodeFS`의 비재귀 `mkdirSync`다. `.data`가
> gitignore라 fresh 체크아웃에 없어 부모 없는 leaf 생성이 ENOENT로 죽는다.
> `createPgliteDatabase`에서 파일 경로면 재귀 생성 후 넘기도록 고친다.
>
> **사용자**: 노스킬로 진행

## 작업 로그

- 2026-07-24: `createPgliteDatabase`에서 파일 경로(`://` 미포함)일 때
  `mkdirSync(dataDir, { recursive: true })`로 부모까지 선생성. 검증 — `tsc --noEmit`
  통과, `bun test src` 95 pass/6 skip/0 fail(`memory://` 경로 무영향 확인),
  중첩 신규 경로로 `createPgliteDatabase` 직접 호출 시 디렉토리 생성·초기화 성공
  (ENOENT 사라짐). 커밋 대기.
