use std::sync::atomic::{AtomicU64, Ordering};

/// 운영 지표 — /metrics에서 Prometheus 텍스트 포맷으로 노출한다.
/// 외부 크레이트 없이 카운터만: 이 서버의 지표는 전부 단조증가 카운터 + 게이지 1개다.
#[derive(Default)]
pub struct Metrics {
    pub ticks_total: AtomicU64,
    pub tick_errors_total: AtomicU64,
    /// due로 감지되어 이 인스턴스가 점유(claim)한 발송 수
    pub claims_total: AtomicU64,
    /// 성공적으로 발송된 메시지(토큰 단위) 수
    pub sent_total: AtomicU64,
    /// 전달 실패로 재시도가 예약된 발송(태스크 단위) 수
    pub retry_scheduled_total: AtomicU64,
    /// 포기된 발송 수 — 재시도 상한 초과 또는 태스크 무효화(abandoned)
    pub abandoned_total: AtomicU64,
    /// 발급자가 무효 판정해 삭제한 구독 토큰 수
    pub dead_tokens_total: AtomicU64,
    /// lease 만료로 복구 경로가 집어간 발송 수 (크래시·재시도 재개)
    pub recoveries_total: AtomicU64,
    /// 마지막 틱 처리 시간(ms) — 게이지
    pub last_tick_ms: AtomicU64,
}

impl Metrics {
    pub fn render_prometheus(&self) -> String {
        let mut out = String::with_capacity(1024);
        let mut counter = |name: &str, help: &str, value: &AtomicU64| {
            out.push_str(&format!(
                "# HELP push_server_{name} {help}\n# TYPE push_server_{name} counter\npush_server_{name} {}\n",
                value.load(Ordering::Relaxed)
            ));
        };
        counter("ticks_total", "스케줄러 틱 수", &self.ticks_total);
        counter("tick_errors_total", "실패한 틱 수", &self.tick_errors_total);
        counter("claims_total", "점유한 발송 수", &self.claims_total);
        counter("sent_total", "발송 성공 메시지 수", &self.sent_total);
        counter(
            "retry_scheduled_total",
            "재시도 예약된 발송 수",
            &self.retry_scheduled_total,
        );
        counter("abandoned_total", "포기한 발송 수", &self.abandoned_total);
        counter(
            "dead_tokens_total",
            "정리한 무효 토큰 수",
            &self.dead_tokens_total,
        );
        counter(
            "recoveries_total",
            "복구 경로가 집어간 발송 수",
            &self.recoveries_total,
        );
        out.push_str(&format!(
            "# HELP push_server_last_tick_ms 마지막 틱 처리 시간(ms)\n# TYPE push_server_last_tick_ms gauge\npush_server_last_tick_ms {}\n",
            self.last_tick_ms.load(Ordering::Relaxed)
        ));
        out
    }
}
