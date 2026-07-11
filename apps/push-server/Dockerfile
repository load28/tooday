# 멀티스테이지: release 빌드 → slim 런타임. 컨텍스트는 apps/push-server.
FROM rust:1.94-slim AS build
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src
RUN cargo build --release

FROM debian:bookworm-slim
# Expo/FCM 게이트웨이로 나가는 TLS에 필요한 루트 인증서만 설치한다.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/target/release/tooday-push-server /usr/local/bin/tooday-push-server
# 컨테이너 밖에서 프로브·메트릭 수집이 가능해야 하므로 기본 바인드를 연다.
ENV PUSH_HTTP_ADDR=0.0.0.0:3003
EXPOSE 3003
USER nobody
ENTRYPOINT ["tooday-push-server"]
