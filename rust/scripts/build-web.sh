#!/usr/bin/env bash
# CSR 번들을 만든다 — wasm 빌드 → wasm-bindgen 글루 → dist/ 조립.
#
# dioxus-cli(dx) 없이도 돌게 wasm-bindgen만 쓴다. dx를 쓰면 `dx serve`로 대체 가능하다.
#   cargo install wasm-bindgen-cli --version <Cargo.lock의 wasm-bindgen 버전>
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROFILE="${1:-release}"
cd "$ROOT"

CARGO_FLAGS=(--package tooday-web --target wasm32-unknown-unknown)
if [ "$PROFILE" = "release" ]; then
  CARGO_FLAGS+=(--release)
fi

cargo build "${CARGO_FLAGS[@]}"

rm -rf dist
mkdir -p dist/wasm dist/assets
wasm-bindgen --target web --no-typescript \
  --out-dir dist/wasm --out-name tooday_web \
  "target/wasm32-unknown-unknown/$PROFILE/tooday-web.wasm"

cp crates/web/index.html dist/index.html
cp crates/web/assets/app.css dist/assets/app.css

echo "dist/ 준비 완료 ($PROFILE)"
