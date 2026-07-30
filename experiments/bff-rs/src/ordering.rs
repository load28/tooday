//! 수동 정렬 키. `apps/bff/src/platform/ordering.ts`(fractional-indexing) 대응.
//!
//! 원본은 fractional-indexing으로 임의의 두 키 "사이"에 끼울 수 있지만, 인메모리
//! 스토어는 리스트 맨 뒤 append(`orderKeyAfter(lastPosition)`)만 쓴다. 여기선 그
//! append 경로만 충실히 옮긴다 — 'a'..='z' 위에서 마지막 글자를 올리거나('a'->'b'),
//! 'z'면 한 글자 늘려('z'->'za') 항상 사전순으로 엄격히 증가하는 키를 만든다.

/// 리스트 맨 뒤에 붙일 키. `last`가 없으면 첫 키("a").
pub fn key_after(last: Option<&str>) -> String {
    match last {
        None => "a".to_string(),
        Some(s) => {
            let mut bytes = s.as_bytes().to_vec();
            match bytes.last_mut() {
                Some(c) if *c < b'z' => {
                    *c += 1;
                    String::from_utf8(bytes).expect("ascii")
                }
                _ => {
                    let mut out = s.to_string();
                    out.push('a');
                    out
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strictly_increasing_appends() {
        let mut last: Option<String> = None;
        let mut prev = String::new();
        for _ in 0..100 {
            let k = key_after(last.as_deref());
            assert!(k > prev, "expected {k:?} > {prev:?}");
            prev = k.clone();
            last = Some(k);
        }
    }

    #[test]
    fn rolls_over_at_z() {
        assert_eq!(key_after(None), "a");
        assert_eq!(key_after(Some("a")), "b");
        assert_eq!(key_after(Some("y")), "z");
        assert_eq!(key_after(Some("z")), "za");
        assert_eq!(key_after(Some("za")), "zb");
    }
}
