//! 수동 정렬 키 — Figma 방식 fractional indexing.
//!
//! float 중간값 방식과 달리 키가 문자열이라 자릿수를 필요한 만큼 늘릴 수 있어
//! 어떤 순서로 몇 번을 끼워 넣어도 "사이값이 안 만들어지는" 정밀도 고갈이 없다.
//! 키는 ASCII 알파벳으로만 구성되며 바이트 순서 비교를 전제하므로,
//! DB 컬럼은 반드시 `text collate "C"`여야 한다 (로케일 collation 금지).
//!
//! TS는 `fractional-indexing` 패키지를 썼다. 같은 입력에 같은 키가 나와야 기존
//! 데이터와 호환되므로 알고리즘을 그대로 옮긴다.

const BASE_62_DIGITS: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

fn digit_index(byte: u8) -> Option<usize> {
    BASE_62_DIGITS.iter().position(|&d| d == byte)
}

fn zero() -> char {
    BASE_62_DIGITS[0] as char
}

/// 정수부의 길이는 첫 글자(자릿수 마커)가 결정한다 — 그래서 append가 O(log N)로만 자란다.
fn integer_length(head: u8) -> Result<usize, OrderKeyError> {
    match head {
        b'a'..=b'z' => Ok((head - b'a') as usize + 2),
        b'A'..=b'Z' => Ok((b'Z' - head) as usize + 2),
        _ => Err(OrderKeyError(format!("Invalid order key head: {}", head as char))),
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OrderKeyError(pub String);

impl std::fmt::Display for OrderKeyError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for OrderKeyError {}

fn smallest_integer() -> String {
    let mut key = String::from("A");
    for _ in 0..26 {
        key.push(zero());
    }
    key
}

fn validate_integer(int: &str) -> Result<(), OrderKeyError> {
    let head = int.as_bytes().first().copied().ok_or_else(|| OrderKeyError("empty integer".into()))?;
    if int.len() != integer_length(head)? {
        return Err(OrderKeyError(format!("invalid integer part of order key: {int}")));
    }
    Ok(())
}

fn integer_part(key: &str) -> Result<&str, OrderKeyError> {
    let head = key.as_bytes().first().copied().ok_or_else(|| OrderKeyError("empty order key".into()))?;
    let length = integer_length(head)?;
    if length > key.len() {
        return Err(OrderKeyError(format!("invalid order key: {key}")));
    }
    Ok(&key[..length])
}

fn validate_order_key(key: &str) -> Result<(), OrderKeyError> {
    if key == smallest_integer() {
        return Err(OrderKeyError(format!("invalid order key: {key}")));
    }
    let integer = integer_part(key)?;
    let fraction = &key[integer.len()..];
    if fraction.ends_with(zero()) {
        return Err(OrderKeyError(format!("invalid order key: {key}")));
    }
    Ok(())
}

fn increment_integer(x: &str) -> Result<Option<String>, OrderKeyError> {
    validate_integer(x)?;
    let head = x.as_bytes()[0];
    let mut digits: Vec<u8> = x.as_bytes()[1..].to_vec();

    let mut carry = true;
    for i in (0..digits.len()).rev() {
        if !carry {
            break;
        }
        let next = digit_index(digits[i]).ok_or_else(|| OrderKeyError(format!("invalid digit in {x}")))? + 1;
        if next == BASE_62_DIGITS.len() {
            digits[i] = BASE_62_DIGITS[0];
        } else {
            digits[i] = BASE_62_DIGITS[next];
            carry = false;
        }
    }

    if !carry {
        return Ok(Some(render(head, &digits)));
    }
    if head == b'Z' {
        return Ok(Some("a0".to_owned()));
    }
    if head == b'z' {
        return Ok(None);
    }
    let next_head = head + 1;
    if next_head > b'a' {
        digits.push(BASE_62_DIGITS[0]);
    } else {
        digits.pop();
    }
    Ok(Some(render(next_head, &digits)))
}

fn decrement_integer(x: &str) -> Result<Option<String>, OrderKeyError> {
    validate_integer(x)?;
    let head = x.as_bytes()[0];
    let mut digits: Vec<u8> = x.as_bytes()[1..].to_vec();
    let last_digit = BASE_62_DIGITS[BASE_62_DIGITS.len() - 1];

    let mut borrow = true;
    for i in (0..digits.len()).rev() {
        if !borrow {
            break;
        }
        let index = digit_index(digits[i]).ok_or_else(|| OrderKeyError(format!("invalid digit in {x}")))?;
        if index == 0 {
            digits[i] = last_digit;
        } else {
            digits[i] = BASE_62_DIGITS[index - 1];
            borrow = false;
        }
    }

    if !borrow {
        return Ok(Some(render(head, &digits)));
    }
    if head == b'a' {
        return Ok(Some(format!("Z{}", last_digit as char)));
    }
    if head == b'A' {
        return Ok(None);
    }
    let next_head = head - 1;
    if next_head < b'Z' {
        digits.push(last_digit);
    } else {
        digits.pop();
    }
    Ok(Some(render(next_head, &digits)))
}

fn render(head: u8, digits: &[u8]) -> String {
    let mut out = String::with_capacity(digits.len() + 1);
    out.push(head as char);
    for &digit in digits {
        out.push(digit as char);
    }
    out
}

/// 두 소수부 사이의 중간 소수부. b가 None이면 위쪽이 열려 있다.
fn midpoint(a: &str, b: Option<&str>) -> Result<String, OrderKeyError> {
    let zero_char = zero();
    if let Some(b) = b {
        if a >= b {
            return Err(OrderKeyError(format!("{a} >= {b}")));
        }
    }
    if a.ends_with(zero_char) || b.is_some_and(|b| b.ends_with(zero_char)) {
        return Err(OrderKeyError("trailing zero".into()));
    }

    if let Some(b) = b {
        // 최장 공통 접두사를 떼어내고 나머지에서 다시 중간값을 찾는다
        let a_bytes = a.as_bytes();
        let b_bytes = b.as_bytes();
        let mut n = 0;
        while n < b_bytes.len() && a_bytes.get(n).copied().unwrap_or(zero_char as u8) == b_bytes[n] {
            n += 1;
        }
        if n > 0 {
            let a_rest = if n < a.len() { &a[n..] } else { "" };
            return Ok(format!("{}{}", &b[..n], midpoint(a_rest, Some(&b[n..]))?));
        }
    }

    // 첫 자리(또는 자리 없음)가 서로 다르다
    let digit_a = if a.is_empty() {
        0
    } else {
        digit_index(a.as_bytes()[0]).ok_or_else(|| OrderKeyError(format!("invalid digit in {a}")))?
    };
    let digit_b = match b {
        Some(b) => digit_index(b.as_bytes()[0]).ok_or_else(|| OrderKeyError(format!("invalid digit in {b}")))?,
        None => BASE_62_DIGITS.len(),
    };

    if digit_b - digit_a > 1 {
        // JS의 Math.round(0.5 * (a + b)) — 반올림은 항상 위로(.5는 상향)
        let mid = (digit_a + digit_b + 1) / 2;
        return Ok((BASE_62_DIGITS[mid] as char).to_string());
    }

    // 첫 자리가 연속이다
    match b {
        Some(b) if b.len() > 1 => Ok(b[..1].to_owned()),
        _ => {
            let a_rest = if a.is_empty() { "" } else { &a[1..] };
            Ok(format!("{}{}", BASE_62_DIGITS[digit_a] as char, midpoint(a_rest, None)?))
        }
    }
}

/// a와 b 사이에 끼울 키. a=None은 맨 앞, b=None은 맨 뒤.
pub fn generate_key_between(a: Option<&str>, b: Option<&str>) -> Result<String, OrderKeyError> {
    if let Some(a) = a {
        validate_order_key(a)?;
    }
    if let Some(b) = b {
        validate_order_key(b)?;
    }
    if let (Some(a), Some(b)) = (a, b) {
        if a >= b {
            return Err(OrderKeyError(format!("{a} >= {b}")));
        }
    }

    match (a, b) {
        (None, None) => Ok(format!("a{}", zero())),
        (None, Some(b)) => {
            let ib = integer_part(b)?;
            let fb = &b[ib.len()..];
            if ib == smallest_integer() {
                return Ok(format!("{ib}{}", midpoint("", Some(fb))?));
            }
            if ib < b {
                return Ok(ib.to_owned());
            }
            decrement_integer(ib)?.ok_or_else(|| OrderKeyError("cannot decrement any more".into()))
        }
        (Some(a), None) => {
            let ia = integer_part(a)?;
            let fa = &a[ia.len()..];
            match increment_integer(ia)? {
                Some(incremented) => Ok(incremented),
                None => Ok(format!("{ia}{}", midpoint(fa, None)?)),
            }
        }
        (Some(a), Some(b)) => {
            let ia = integer_part(a)?;
            let fa = &a[ia.len()..];
            let ib = integer_part(b)?;
            let fb = &b[ib.len()..];
            if ia == ib {
                return Ok(format!("{ia}{}", midpoint(fa, Some(fb))?));
            }
            let incremented =
                increment_integer(ia)?.ok_or_else(|| OrderKeyError("cannot increment any more".into()))?;
            if incremented.as_str() < b {
                return Ok(incremented);
            }
            Ok(format!("{ia}{}", midpoint(fa, None)?))
        }
    }
}

/// 리스트 맨 뒤에 붙일 키. last가 None이면 첫 키.
pub fn order_key_after(last: Option<&str>) -> String {
    generate_key_between(last, None).expect("append는 고갈되지 않는다")
}

/// a와 b 사이에 끼울 키. a=None은 맨 앞, b=None은 맨 뒤.
pub fn order_key_between(a: Option<&str>, b: Option<&str>) -> String {
    generate_key_between(a, b).expect("fractional index는 사이값이 항상 존재한다")
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashSet;

    #[test]
    fn 맨_뒤_추가를_반복해도_항상_증가하고_키가_짧게_유지된다() {
        let mut last: Option<String> = None;
        let mut keys: Vec<String> = Vec::new();
        for _ in 0..2000 {
            let next = order_key_after(last.as_deref());
            if let Some(previous) = &last {
                assert!(next.as_str() > previous.as_str(), "{next} > {previous}");
            }
            keys.push(next.clone());
            last = Some(next);
        }
        // 정수부가 자릿수 마커를 갖는 Figma 방식이라 append는 O(log N)로만 자란다
        assert!(keys.iter().map(String::len).max().unwrap() <= 5);
    }

    #[test]
    fn 같은_틈에_1000번_연속으로_끼워도_고갈되지_않는다() {
        let mut low = order_key_after(None);
        let high = order_key_after(Some(&low));
        let mut seen: HashSet<String> = HashSet::from([low.clone(), high.clone()]);
        for _ in 0..1000 {
            let mid = order_key_between(Some(&low), Some(&high));
            assert!(mid.as_str() > low.as_str() && mid.as_str() < high.as_str());
            assert!(!seen.contains(&mid));
            seen.insert(mid.clone());
            low = mid; // 항상 같은 위쪽 틈을 다시 쪼갠다 — 최악 시나리오
        }
    }

    #[test]
    fn 키는_ascii로만_구성된다() {
        let first = order_key_after(None);
        let samples = [
            first.clone(),
            order_key_between(None, Some(&first)),
            order_key_after(Some(&first)),
        ];
        for key in samples {
            assert!(key.bytes().all(|b| (0x21..=0x7e).contains(&b)), "{key}");
        }
    }

    #[test]
    fn 맨_앞_삽입도_무한히_가능하다() {
        let mut first = order_key_after(None);
        for _ in 0..500 {
            let before = order_key_between(None, Some(&first));
            assert!(before.as_str() < first.as_str());
            first = before;
        }
    }

    #[test]
    fn ts_fractional_indexing과_같은_키를_낸다() {
        // 참조 구현(rocicorp/fractional-indexing)의 알려진 출력 — 기존 데이터와의 호환 계약
        assert_eq!(order_key_after(None), "a0");
        assert_eq!(order_key_after(Some("a0")), "a1");
        assert_eq!(order_key_after(Some("az")), "b00");
        assert_eq!(order_key_between(Some("a0"), Some("a1")), "a0V");
        assert_eq!(order_key_between(None, Some("a0")), "Zz");
    }
}
