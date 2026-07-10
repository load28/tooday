//! 수동 정렬 키 — Figma 방식 fractional indexing.
//!
//! npm `fractional-indexing@4`(BFF가 쓰던 구현)의 기본 알파벳 동작을 그대로 포팅했다.
//! DB에 이미 그 형식("a0", "a1", …)의 키가 저장돼 있으므로 **출력이 바이트 단위로
//! 동일해야** 기존 행과 새 행이 올바르게 섞여 정렬된다 — 패리티는 테스트로 못박는다.
//! 키는 바이트 순서 비교를 전제하므로 DB 컬럼은 반드시 `text collate "C"`여야 한다.

/// 소수부 알파벳 (base 62, 문자 코드 오름차순)
const DIGITS: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
/// 정수부 머리 알파벳 — 앞 절반(A-Z)은 음수 길이, 뒤 절반(a-z)은 양수 길이 마커
const INT_DIGITS: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

#[derive(Debug, thiserror::Error)]
#[error("잘못된 정렬 키: {0}")]
pub struct OrderKeyError(String);

type Result<T> = std::result::Result<T, OrderKeyError>;

fn digit_index(byte: u8) -> Result<usize> {
    DIGITS
        .iter()
        .position(|&d| d == byte)
        .ok_or_else(|| OrderKeyError(format!("digit {}", byte as char)))
}

fn head_index(byte: u8) -> Result<usize> {
    INT_DIGITS
        .iter()
        .position(|&d| d == byte)
        .ok_or_else(|| OrderKeyError(format!("head {}", byte as char)))
}

/// 머리 문자가 표시하는 정수부 전체 길이(머리 포함)
fn integer_length(head: u8) -> Result<usize> {
    let i = head_index(head)?;
    let half = INT_DIGITS.len() / 2;
    Ok(if i < half { half - i + 1 } else { i - half + 2 })
}

fn integer_part(key: &[u8]) -> Result<&[u8]> {
    let len = integer_length(key[0])?;
    if len > key.len() {
        return Err(OrderKeyError(String::from_utf8_lossy(key).into_owned()));
    }
    Ok(&key[..len])
}

/// 가장 작은 정수부("A" + "0"×26) — 이 아래로는 내려갈 수 없다
fn is_smallest_integer(int: &[u8]) -> bool {
    int.len() == INT_DIGITS.len() / 2 + 1 && int[0] == INT_DIGITS[0] && int[1..].iter().all(|&b| b == DIGITS[0])
}

fn validate_order_key(key: &[u8]) -> Result<()> {
    if key.is_empty() {
        return Err(OrderKeyError("빈 키".into()));
    }
    if is_smallest_integer(key) {
        return Err(OrderKeyError(String::from_utf8_lossy(key).into_owned()));
    }
    let int = integer_part(key)?;
    let frac = &key[int.len()..];
    for &byte in frac {
        digit_index(byte)?;
    }
    if frac.last() == Some(&DIGITS[0]) {
        return Err(OrderKeyError(String::from_utf8_lossy(key).into_owned()));
    }
    Ok(())
}

/// a와 b 사이의 소수부 중간값. `a`는 빈 문자열 가능, `b`는 None(상한 없음) 가능.
fn midpoint(a: &[u8], b: Option<&[u8]>) -> Result<Vec<u8>> {
    let zero = DIGITS[0];
    if let Some(b) = b {
        if a >= b {
            return Err(OrderKeyError(format!(
                "{} >= {}",
                String::from_utf8_lossy(a),
                String::from_utf8_lossy(b)
            )));
        }
        // 최장 공통 접두사를 떼어내고 재귀한다 (a는 지나가며 0으로 패딩).
        let mut n = 0;
        while n < b.len() && a.get(n).copied().unwrap_or(zero) == b[n] {
            n += 1;
        }
        if n > 0 {
            let rest = midpoint(if n <= a.len() { &a[n..] } else { &[] }, Some(&b[n..]))?;
            let mut out = b[..n].to_vec();
            out.extend_from_slice(&rest);
            return Ok(out);
        }
    }
    let digit_a = if a.is_empty() { 0 } else { digit_index(a[0])? };
    let digit_b = match b {
        Some(b) => digit_index(b[0])?,
        None => DIGITS.len(),
    };
    if digit_b - digit_a > 1 {
        // JS Math.round(0.5 * (a + b)) — .5는 올림
        let mid = (digit_a + digit_b).div_ceil(2);
        return Ok(vec![DIGITS[mid]]);
    }
    // 첫 자리가 연속 — b의 첫 자리를 쓰거나 a의 꼬리에서 더 파고든다
    if let Some(b) = b {
        if b.len() > 1 {
            return Ok(b[..1].to_vec());
        }
    }
    let rest = midpoint(if a.is_empty() { &[] } else { &a[1..] }, None)?;
    let mut out = vec![DIGITS[digit_a]];
    out.extend_from_slice(&rest);
    Ok(out)
}

/// 정수부 +1. 최대 정수면 None.
fn increment_integer(x: &[u8]) -> Result<Option<Vec<u8>>> {
    let head = x[0];
    let zero = DIGITS[0];
    let mut trailing: Vec<u8> = Vec::new();
    for i in (1..x.len()).rev() {
        let d = digit_index(x[i])? + 1;
        if d == DIGITS.len() {
            trailing.insert(0, zero);
        } else {
            let mut out = vec![head];
            out.extend_from_slice(&x[1..i]);
            out.push(DIGITS[d]);
            out.extend_from_slice(&trailing);
            return Ok(Some(out));
        }
    }
    // 자릿수 전체에서 올림 발생 — 머리를 한 단계 키우고 길이를 맞춘다
    let head_idx = head_index(head)?;
    if head_idx == INT_DIGITS.len() - 1 {
        return Ok(None);
    }
    let next_head = INT_DIGITS[head_idx + 1];
    let delta = integer_length(next_head)? as isize - integer_length(head)? as isize;
    let mut out = vec![next_head];
    match delta.cmp(&0) {
        std::cmp::Ordering::Greater => {
            out.extend_from_slice(&trailing);
            out.push(zero);
        }
        std::cmp::Ordering::Less => out.extend_from_slice(&trailing[1..]),
        std::cmp::Ordering::Equal => out.extend_from_slice(&trailing),
    }
    Ok(Some(out))
}

/// 정수부 -1. 최소 정수면 None.
fn decrement_integer(x: &[u8]) -> Result<Option<Vec<u8>>> {
    let head = x[0];
    let last = DIGITS[DIGITS.len() - 1];
    let mut trailing: Vec<u8> = Vec::new();
    for i in (1..x.len()).rev() {
        let raw = digit_index(x[i])?;
        if raw == 0 {
            trailing.insert(0, last);
        } else {
            let mut out = vec![head];
            out.extend_from_slice(&x[1..i]);
            out.push(DIGITS[raw - 1]);
            out.extend_from_slice(&trailing);
            return Ok(Some(out));
        }
    }
    // 자릿수 전체에서 내림 발생 — 머리를 한 단계 줄이고 길이를 맞춘다
    let head_idx = head_index(head)?;
    if head_idx == 0 {
        return Ok(None);
    }
    let prev_head = INT_DIGITS[head_idx - 1];
    let delta = integer_length(prev_head)? as isize - integer_length(head)? as isize;
    let mut out = vec![prev_head];
    match delta.cmp(&0) {
        std::cmp::Ordering::Greater => {
            out.extend_from_slice(&trailing);
            out.push(last);
        }
        std::cmp::Ordering::Less => out.extend_from_slice(&trailing[1..]),
        std::cmp::Ordering::Equal => out.extend_from_slice(&trailing),
    }
    Ok(Some(out))
}

/// a(하한)와 b(상한) 사이 키. None은 각각 맨 앞/맨 뒤.
pub fn order_key_between(a: Option<&str>, b: Option<&str>) -> Result<String> {
    let mut a = a.map(str::as_bytes);
    let mut b = b.map(str::as_bytes);
    if let Some(key) = a {
        validate_order_key(key)?;
    }
    if let Some(key) = b {
        validate_order_key(key)?;
    }
    if let (Some(ka), Some(kb)) = (a, b) {
        if ka > kb {
            std::mem::swap(&mut a, &mut b);
        }
    }

    let out = match (a, b) {
        (None, None) => {
            // 가장 짧은 양수 머리("a") + 0
            vec![INT_DIGITS[INT_DIGITS.len() / 2], DIGITS[0]]
        }
        (None, Some(b)) => {
            let ib = integer_part(b)?;
            let fb = &b[ib.len()..];
            if is_smallest_integer(ib) {
                let mut out = ib.to_vec();
                out.extend_from_slice(&midpoint(&[], Some(fb))?);
                out
            } else if ib < b {
                ib.to_vec()
            } else {
                decrement_integer(ib)?.ok_or_else(|| OrderKeyError("더 내릴 수 없습니다".into()))?
            }
        }
        (Some(a), None) => {
            let ia = integer_part(a)?;
            let fa = &a[ia.len()..];
            match increment_integer(ia)? {
                Some(next) => next,
                None => {
                    let mut out = ia.to_vec();
                    out.extend_from_slice(&midpoint(fa, None)?);
                    out
                }
            }
        }
        (Some(a), Some(b)) => {
            let ia = integer_part(a)?;
            let fa = &a[ia.len()..];
            let ib = integer_part(b)?;
            let fb = &b[ib.len()..];
            if ia == ib {
                let mut out = ia.to_vec();
                out.extend_from_slice(&midpoint(fa, Some(fb))?);
                out
            } else {
                let next = increment_integer(ia)?.ok_or_else(|| OrderKeyError("더 올릴 수 없습니다".into()))?;
                if next.as_slice() < b {
                    next
                } else {
                    let mut out = ia.to_vec();
                    out.extend_from_slice(&midpoint(fa, None)?);
                    out
                }
            }
        }
    };
    Ok(String::from_utf8(out).expect("정렬 키는 항상 ASCII"))
}

/// 리스트 맨 뒤에 붙일 키. last가 None이면 첫 키.
pub fn order_key_after(last: Option<&str>) -> Result<String> {
    order_key_between(last, None)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// npm fractional-indexing@4 generateKeyBetween과의 패리티 벡터
    /// (bun으로 생성 — 기존 DB 키와 바이트 동일해야 한다)
    #[test]
    fn parity_with_js_implementation() {
        // generateKeyBetween(null, null)
        assert_eq!(order_key_between(None, None).unwrap(), "a0");
        // 맨 뒤 이어붙이기 체인 (orderKeyAfter 사용 경로)
        let mut key = order_key_after(None).unwrap();
        let expected_chain = [
            "a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "a9", "aA", "aB", "aC", "aD", "aE", "aF",
        ];
        for expected in expected_chain {
            key = order_key_after(Some(&key)).unwrap();
            assert_eq!(key, expected);
        }
        // 'az' 다음은 자리 올림 — JS: generateKeyBetween('az', null) === 'b00'
        assert_eq!(order_key_after(Some("az")).unwrap(), "b00");
        assert_eq!(order_key_after(Some("b0z")).unwrap(), "b10");
        assert_eq!(order_key_after(Some("bzz")).unwrap(), "c000");
        // 사이 끼워넣기 — JS 출력과 동일해야 한다
        assert_eq!(order_key_between(Some("a0"), Some("a1")).unwrap(), "a0V");
        assert_eq!(order_key_between(Some("a1"), Some("a2")).unwrap(), "a1V");
        assert_eq!(order_key_between(None, Some("a0")).unwrap(), "Zz");
        assert_eq!(order_key_between(None, Some("Zz")).unwrap(), "Zy");
        assert_eq!(order_key_between(Some("a0"), Some("a0V")).unwrap(), "a0G");
        assert_eq!(order_key_between(Some("a0V"), Some("a1")).unwrap(), "a0l");
        assert_eq!(order_key_between(Some("Zz"), Some("a0")).unwrap(), "ZzV");
        assert_eq!(order_key_between(Some("Zz"), Some("a1")).unwrap(), "a0");
    }

    #[test]
    fn keys_stay_sorted_when_appending() {
        let mut last: Option<String> = None;
        for _ in 0..200 {
            let next = order_key_after(last.as_deref()).unwrap();
            if let Some(prev) = &last {
                assert!(prev.as_str() < next.as_str(), "{prev} < {next} 실패");
            }
            last = Some(next);
        }
    }

    #[test]
    fn keys_stay_sorted_when_inserting_between() {
        // 같은 틈을 반복해서 쪼개도 정밀도 고갈 없이 정렬이 유지된다
        let mut a = String::from("a0");
        let b = "a1";
        for _ in 0..100 {
            let mid = order_key_between(Some(&a), Some(b)).unwrap();
            assert!(a.as_str() < mid.as_str() && mid.as_str() < b, "{a} < {mid} < {b} 실패");
            a = mid;
        }
    }

    #[test]
    fn rejects_invalid_keys() {
        assert!(order_key_after(Some("")).is_err());
        assert!(order_key_after(Some("!!")).is_err());
        assert!(order_key_between(Some("a0"), Some("a0")).is_err());
    }
}
