//! 테스트 전용 데이터베이스 준비 — TS `platform/db/testing.ts` 대응.
//!
//! TS는 임베디드 PGlite를 프로세스당 하나 띄우고 TRUNCATE로 격리했다. 러스트에는
//! 임베디드 Postgres 대응물이 없으므로 실제 서버가 있을 때만 돈다:
//! `TOODAY_TEST_DATABASE_URL`(없으면 `DATABASE_URL`)이 설정된 경우에만
//! [`test_database_url`]이 Some이고, 테스트는 이 값으로 스킵을 선언한다.
//!
//! 격리는 TRUNCATE 대신 요청마다 임시 데이터베이스를 만들어서 한다 — 병렬로 도는
//! 러스트 테스트끼리 같은 테이블을 밟지 않게 한다.

use sqlx::{Connection, PgConnection, PgPool};

use crate::platform::db::migrate::migrate_to_latest;
use crate::platform::db::postgres::create_postgres_pool;
use crate::platform::ids::new_id;

/// 테스트용 Postgres 접속 문자열. 없으면 SQL 어댑터 테스트를 건너뛴다.
pub fn test_database_url() -> Option<String> {
    for key in ["TOODAY_TEST_DATABASE_URL", "DATABASE_URL"] {
        if let Ok(url) = std::env::var(key) {
            if !url.is_empty() {
                return Some(url);
            }
        }
    }
    None
}

/// 마이그레이션이 적용된 빈 데이터베이스에 붙은 풀을 돌려준다.
/// 호출마다 새 데이터베이스를 만들어 테스트 간 격리를 보장한다.
///
/// `test_database_url()`이 None이면(스킵 가드를 우회해 호출된 경우) 즉시 패닉한다.
pub async fn test_database() -> PgPool {
    let base_url = test_database_url()
        .expect("test_database()는 TOODAY_TEST_DATABASE_URL이 설정됐을 때만 호출할 수 있다");

    let name = format!("tooday_test_{}", new_id().replace('-', ""));
    let mut admin = PgConnection::connect(&base_url).await.expect("관리 연결");
    sqlx::query(&format!(r#"create database "{name}""#))
        .execute(&mut admin)
        .await
        .expect("테스트 데이터베이스 생성");
    drop(admin);

    let pool = create_postgres_pool(&swap_database(&base_url, &name), 5).await.expect("테스트 풀");
    migrate_to_latest(&pool).await.expect("마이그레이션");
    pool
}

/// 접속 문자열의 데이터베이스 이름만 갈아끼운다 — 자격증명·호스트·쿼리는 유지한다.
fn swap_database(url: &str, database: &str) -> String {
    let (prefix, rest) = url.split_at(url.find("://").map(|index| index + 3).unwrap_or(0));
    let (authority, tail) = match rest.find('/') {
        Some(index) => (&rest[..index], &rest[index + 1..]),
        None => (rest, ""),
    };
    let query = tail.find('?').map(|index| &tail[index..]).unwrap_or("");
    format!("{prefix}{authority}/{database}{query}")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn 데이터베이스_이름만_갈아끼운다() {
        assert_eq!(
            swap_database("postgres://user:pw@localhost:5432/postgres", "tooday_test_1"),
            "postgres://user:pw@localhost:5432/tooday_test_1"
        );
        assert_eq!(
            swap_database("postgres://localhost/postgres?sslmode=disable", "t"),
            "postgres://localhost/t?sslmode=disable"
        );
        assert_eq!(swap_database("postgres://localhost", "t"), "postgres://localhost/t");
    }
}
