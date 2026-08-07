#[cfg(test)]
use crate::modules::pub_;

const CACHEABLE_PATH_PREFIX: &str = "pub.";

pub const PRIVATE_CACHE_CONTROL: &str = "private, no-store";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PublicCacheDirectives {
    pub max_age: u32,
    pub s_max_age: u32,
    pub stale_while_revalidate: u32,
}

pub const DEFAULT_PUBLIC_CACHE_DIRECTIVES: PublicCacheDirectives =
    PublicCacheDirectives { max_age: 60, s_max_age: 300, stale_while_revalidate: 600 };

/// 경로별 예외. 키는 pub 라우터에 실제 존재하는 프로시저여야 한다 —
/// [`cacheable_paths_exist`] 테스트가 라우터와의 어긋남을 잡는다.
pub const CACHE_DIRECTIVES_BY_PATH: &[(&str, PublicCacheDirectives)] = &[(
    "pub.appConfig",
    PublicCacheDirectives { max_age: 300, s_max_age: 600, stale_while_revalidate: 3600 },
)];

pub fn serialize_public_cache_control(directives: PublicCacheDirectives) -> String {
    format!(
        "public, max-age={}, s-maxage={}, stale-while-revalidate={}",
        directives.max_age, directives.s_max_age, directives.stale_while_revalidate
    )
}

fn path_directives(path: &str) -> Option<PublicCacheDirectives> {
    CACHE_DIRECTIVES_BY_PATH
        .iter()
        .find_map(|(candidate, directives)| (*candidate == path).then_some(*directives))
}

pub struct ResponseMeta<'a> {
    pub paths: &'a [String],
    pub kind: crate::trpc::init::ProcedureKind,
    pub has_errors: bool,
}

/// 캐시 정책의 핵심 술어: 성공한 pub.* 단독 쿼리만 public 캐시 대상이다
pub fn is_publicly_cacheable(meta: &ResponseMeta<'_>) -> bool {
    matches!(meta.kind, crate::trpc::init::ProcedureKind::Query)
        && !meta.has_errors
        && !meta.paths.is_empty()
        && meta.paths.iter().all(|path| path.starts_with(CACHEABLE_PATH_PREFIX))
}

pub fn resolve_cache_control(meta: &ResponseMeta<'_>) -> String {
    if !is_publicly_cacheable(meta) {
        return PRIVATE_CACHE_CONTROL.to_owned();
    }
    let directives = match meta.paths {
        [single] => path_directives(single).unwrap_or(DEFAULT_PUBLIC_CACHE_DIRECTIVES),
        _ => DEFAULT_PUBLIC_CACHE_DIRECTIVES,
    };
    serialize_public_cache_control(directives)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::trpc::init::ProcedureKind;

    fn meta<'a>(paths: &'a [String], kind: ProcedureKind, has_errors: bool) -> ResponseMeta<'a> {
        ResponseMeta { paths, kind, has_errors }
    }

    fn paths(values: &[&str]) -> Vec<String> {
        values.iter().map(|value| (*value).to_owned()).collect()
    }

    #[test]
    fn pub_단독_쿼리는_경로별_public_캐시를_받는다() {
        let list = paths(&["pub.appConfig"]);
        assert_eq!(
            resolve_cache_control(&meta(&list, ProcedureKind::Query, false)),
            "public, max-age=300, s-maxage=600, stale-while-revalidate=3600"
        );
    }

    #[test]
    fn 경로별_예외가_없는_pub_쿼리는_기본_public_캐시를_받는다() {
        let list = paths(&["pub.other"]);
        assert_eq!(
            resolve_cache_control(&meta(&list, ProcedureKind::Query, false)),
            "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
        );
    }

    #[test]
    fn pub_외_경로가_섞이면_캐시되지_않는다() {
        let list = paths(&["pub.appConfig", "user.me"]);
        assert_eq!(resolve_cache_control(&meta(&list, ProcedureKind::Query, false)), PRIVATE_CACHE_CONTROL);
    }

    #[test]
    fn 뮤테이션과_에러는_캐시되지_않는다() {
        let list = paths(&["pub.appConfig"]);
        assert_eq!(
            resolve_cache_control(&meta(&list, ProcedureKind::Mutation, false)),
            PRIVATE_CACHE_CONTROL
        );
        assert_eq!(resolve_cache_control(&meta(&list, ProcedureKind::Query, true)), PRIVATE_CACHE_CONTROL);
    }

    #[test]
    fn 경로가_없으면_캐시되지_않는다() {
        assert_eq!(resolve_cache_control(&meta(&[], ProcedureKind::Query, false)), PRIVATE_CACHE_CONTROL);
    }

    #[test]
    fn 여러_pub_경로의_배치는_기본_public_캐시를_받는다() {
        let list = paths(&["pub.appConfig", "pub.other"]);
        assert_eq!(
            resolve_cache_control(&meta(&list, ProcedureKind::Query, false)),
            "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
        );
    }

    /// 캐시 예외 경로는 pub 라우터에 실제 존재해야 한다 — TS는 타입으로 강제했다
    #[test]
    fn cacheable_paths_exist() {
        for (path, _) in CACHE_DIRECTIVES_BY_PATH {
            let name = path.strip_prefix(CACHEABLE_PATH_PREFIX).expect("pub. 접두사");
            assert!(
                pub_::router::PROCEDURES.iter().any(|procedure| procedure.name == name),
                "{path}는 pub 라우터에 없다"
            );
        }
    }
}
