# CSR E2E

실제 브라우저(Chromium)로 웹을 구동해 화면·라우팅·인증·낙관적 업데이트가
스펙대로 도는지 확인한다. 단위·통합 테스트(`cargo test`)가 잡지 못하는
"브라우저에서만 드러나는" 문제(훅 순서, wasm 시계, 캐시 리액티비티, CSS 계단)를
여기서 잡는다.

## 실행

```bash
# 1) BFF — 웹과 같은 호스트여야 한다(SameSite=Lax 쿠키)
BFF_ALLOWED_ORIGINS=http://localhost:8080 cargo run -p tooday-bff

# 2) 웹 번들 + 정적 서버
./scripts/build-web.sh
./scripts/serve-web.py dist 8080

# 3) E2E
cd e2e && npm install && npm test
```

`WEB`(기본 `http://localhost:8080`), `SHOTS`(스크린샷 출력 디렉토리),
`CHROMIUM`(브라우저 실행 파일 경로)을 환경변수로 바꿀 수 있다.
