//! Runtime validation driven by the *same* IR the codegen emits.
//!
//! This is the point of the whole exercise: the Rust server validates incoming
//! JSON with the identical contract the frontend's valibot schema enforces —
//! one definition, two consumers, no drift.
//!
//! Semantics follow valibot `parse`: pipes transform then check (so `trim` runs
//! before `minLength`), `object` strips unknown keys, `optional` fills defaults.

use crate::ir::*;
use serde_json::{Map, Value};

pub type ValidateResult = Result<Value, Vec<String>>;

pub fn validate(reg: &Registry, schema: &Schema, value: &Value) -> ValidateResult {
    validate_at(reg, schema, value, "")
}

/// Validate a named schema const (e.g. `"createTaskRequestSchema"`).
pub fn validate_named(reg: &Registry, name: &str, value: &Value) -> ValidateResult {
    let schema = reg
        .schema_of(name)
        .unwrap_or_else(|| panic!("unknown schema `{name}`"));
    validate_at(reg, schema, value, name)
}

fn err(path: &str, msg: impl Into<String>) -> Vec<String> {
    let p = if path.is_empty() { "<root>" } else { path };
    vec![format!("{p}: {}", msg.into())]
}

fn validate_at(reg: &Registry, schema: &Schema, value: &Value, path: &str) -> ValidateResult {
    match schema {
        Schema::String(actions) => validate_string(actions, value, path),
        Schema::Number(actions) => validate_number(reg, actions, value, path),
        Schema::Boolean => match value {
            Value::Bool(_) => Ok(value.clone()),
            _ => Err(err(path, "expected boolean")),
        },
        Schema::PicklistConst(name) => {
            let options = reg
                .str_array_const(name)
                .unwrap_or_else(|| panic!("picklist references unknown const `{name}`"));
            match value.as_str() {
                Some(s) if options.contains(&s) => Ok(value.clone()),
                _ => Err(err(path, format!("expected one of {options:?}"))),
            }
        }
        Schema::Ref(name) => {
            let inner = reg
                .schema_of(name)
                .unwrap_or_else(|| panic!("ref to unknown schema `{name}`"));
            validate_at(reg, inner, value, path)
        }
        Schema::Array(inner) => {
            let arr = match value.as_array() {
                Some(a) => a,
                None => return Err(err(path, "expected array")),
            };
            let mut out = Vec::with_capacity(arr.len());
            let mut errors = Vec::new();
            for (i, item) in arr.iter().enumerate() {
                match validate_at(reg, inner, item, &format!("{path}[{i}]")) {
                    Ok(v) => out.push(v),
                    Err(e) => errors.extend(e),
                }
            }
            if errors.is_empty() {
                Ok(Value::Array(out))
            } else {
                Err(errors)
            }
        }
        Schema::Nullable(inner) => {
            if value.is_null() {
                Ok(Value::Null)
            } else {
                validate_at(reg, inner, value, path)
            }
        }
        // A bare optional with a present value just validates the inner schema;
        // absence/default is handled by the object walker.
        Schema::Optional(inner, _) => validate_at(reg, inner, value, path),
        Schema::Object(obj) => validate_object(reg, obj, value, path),
        Schema::Checked(inner, check) => {
            let out = validate_at(reg, inner, value, path)?;
            if (check.predicate)(&out) {
                Ok(out)
            } else {
                Err(err(path, check.message))
            }
        }
    }
}

fn validate_string(actions: &[StringAction], value: &Value, path: &str) -> ValidateResult {
    let mut s = match value.as_str() {
        Some(s) => s.to_string(),
        None => return Err(err(path, "expected string")),
    };
    for action in actions {
        match action {
            StringAction::Trim => s = s.trim().to_string(),
            StringAction::MinLength(n) => {
                let min = num_lit(n);
                if s.chars().count() < min as usize {
                    return Err(err(path, format!("expected length >= {}", min as i64)));
                }
            }
            StringAction::MaxLength(n) => {
                let max = num_lit(n);
                if s.chars().count() > max as usize {
                    return Err(err(path, format!("expected length <= {}", max as i64)));
                }
            }
            StringAction::NonEmpty => {
                if s.is_empty() {
                    return Err(err(path, "expected non-empty string"));
                }
            }
            StringAction::Email => {
                if !is_email(&s) {
                    return Err(err(path, "invalid email"));
                }
            }
            StringAction::IsoDate => {
                if !is_iso_date(&s) {
                    return Err(err(path, "invalid ISO date (YYYY-MM-DD)"));
                }
            }
            StringAction::IsoTime => {
                if !is_iso_time(&s) {
                    return Err(err(path, "invalid ISO time (HH:mm)"));
                }
            }
        }
    }
    Ok(Value::String(s))
}

fn validate_number(
    _reg: &Registry,
    actions: &[NumberAction],
    value: &Value,
    path: &str,
) -> ValidateResult {
    let n = match value.as_f64() {
        Some(n) => n,
        None => return Err(err(path, "expected number")),
    };
    for action in actions {
        match action {
            NumberAction::Integer => {
                if n.fract() != 0.0 {
                    return Err(err(path, "expected integer"));
                }
            }
            NumberAction::MinValue(m) => {
                if n < num_lit(m) {
                    return Err(err(path, format!("expected >= {}", num_lit(m))));
                }
            }
            NumberAction::MaxValue(m) => {
                if n > num_lit(m) {
                    return Err(err(path, format!("expected <= {}", num_lit(m))));
                }
            }
        }
    }
    Ok(value.clone())
}

fn validate_object(
    reg: &Registry,
    obj: &ObjectSchema,
    value: &Value,
    path: &str,
) -> ValidateResult {
    let input = match value.as_object() {
        Some(m) => m,
        None => return Err(err(path, "expected object")),
    };
    let mut out = Map::new();
    let mut errors = Vec::new();

    for (name, field_schema) in flat_fields(reg, obj) {
        let field_path = if path.is_empty() {
            name.to_string()
        } else {
            format!("{path}.{name}")
        };
        match field_schema {
            Schema::Optional(inner, default) => match input.get(name) {
                Some(v) => match validate_at(reg, inner, v, &field_path) {
                    Ok(ok) => {
                        out.insert(name.to_string(), ok);
                    }
                    Err(e) => errors.extend(e),
                },
                None => {
                    if let Some(Default::Null) = default {
                        out.insert(name.to_string(), Value::Null);
                    }
                    // otherwise leave the key absent
                }
            },
            required => match input.get(name) {
                Some(v) => match validate_at(reg, required, v, &field_path) {
                    Ok(ok) => {
                        out.insert(name.to_string(), ok);
                    }
                    Err(e) => errors.extend(e),
                },
                None => errors.extend(err(&field_path, "required field missing")),
            },
        }
    }

    if errors.is_empty() {
        Ok(Value::Object(out))
    } else {
        Err(errors)
    }
}

/// Flatten an object's fields, expanding `...ref.entries` spreads (following
/// refs to their object schema).
fn flat_fields<'a>(reg: &'a Registry, obj: &'a ObjectSchema) -> Vec<(&'a str, &'a Schema)> {
    let mut fields = Vec::new();
    for item in &obj.items {
        match item {
            ObjectItem::Field { name, schema, .. } => fields.push((*name, schema)),
            ObjectItem::Spread(ref_name) => {
                let inner = resolve_object(reg, ref_name).unwrap_or_else(|| {
                    panic!("spread `...{ref_name}.entries` does not resolve to an object")
                });
                fields.extend(flat_fields(reg, inner));
            }
        }
    }
    fields
}

fn resolve_object<'a>(reg: &'a Registry, name: &str) -> Option<&'a ObjectSchema> {
    let mut schema = reg.schema_of(name)?;
    loop {
        match schema {
            Schema::Object(obj) => return Some(obj),
            Schema::Ref(next) => schema = reg.schema_of(next)?,
            _ => return None,
        }
    }
}

fn num_lit(arg: &NumArg) -> f64 {
    match arg {
        NumArg::Lit(n) => *n,
        // Const args are resolved against the registry by callers that have it;
        // every const used in the contract is numeric, so panic here is a bug.
        NumArg::Const(name) => panic!("num_lit called on unresolved const `{name}`"),
    }
}

// --- primitive format checks (regex-free, valibot-compatible for our inputs) ---

fn is_email(s: &str) -> bool {
    let mut parts = s.split('@');
    let (Some(local), Some(domain), None) = (parts.next(), parts.next(), parts.next()) else {
        return false;
    };
    !local.is_empty()
        && !domain.is_empty()
        && domain.contains('.')
        && !s.contains(char::is_whitespace)
        && !domain.starts_with('.')
        && !domain.ends_with('.')
}

fn is_iso_date(s: &str) -> bool {
    let b = s.as_bytes();
    if b.len() != 10 || b[4] != b'-' || b[7] != b'-' {
        return false;
    }
    if !b[0..4].iter().all(|c| c.is_ascii_digit())
        || !b[5..7].iter().all(|c| c.is_ascii_digit())
        || !b[8..10].iter().all(|c| c.is_ascii_digit())
    {
        return false;
    }
    let month: u32 = s[5..7].parse().unwrap();
    let day: u32 = s[8..10].parse().unwrap();
    (1..=12).contains(&month) && (1..=31).contains(&day)
}

fn is_iso_time(s: &str) -> bool {
    let b = s.as_bytes();
    if b.len() != 5 || b[2] != b':' {
        return false;
    }
    if !b[0..2].iter().all(|c| c.is_ascii_digit()) || !b[3..5].iter().all(|c| c.is_ascii_digit()) {
        return false;
    }
    let hour: u32 = s[0..2].parse().unwrap();
    let min: u32 = s[3..5].parse().unwrap();
    hour <= 23 && min <= 59
}

/// Resolve any `NumArg::Const` in `MinLength`/`MinValue` args against the
/// registry so `validate` never meets an unresolved const. Called once by
/// `contract::registry_resolved()`.
pub fn resolve_consts(reg: &Registry, schema: &mut Schema) {
    match schema {
        Schema::String(actions) => {
            for a in actions {
                match a {
                    StringAction::MinLength(n) | StringAction::MaxLength(n) => resolve_arg(reg, n),
                    _ => {}
                }
            }
        }
        Schema::Number(actions) => {
            for a in actions {
                match a {
                    NumberAction::MinValue(n) | NumberAction::MaxValue(n) => resolve_arg(reg, n),
                    _ => {}
                }
            }
        }
        Schema::Array(inner) | Schema::Nullable(inner) | Schema::Optional(inner, _) => {
            resolve_consts(reg, inner)
        }
        Schema::Checked(inner, _) => resolve_consts(reg, inner),
        Schema::Object(obj) => {
            for item in &mut obj.items {
                if let ObjectItem::Field { schema, .. } = item {
                    resolve_consts(reg, schema);
                }
            }
        }
        _ => {}
    }
}

fn resolve_arg(reg: &Registry, arg: &mut NumArg) {
    if let NumArg::Const(name) = arg {
        *arg = NumArg::Lit(
            reg.num_const(name)
                .unwrap_or_else(|| panic!("const arg references unknown numeric const `{name}`")),
        );
    }
}
