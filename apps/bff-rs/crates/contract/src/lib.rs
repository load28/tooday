//! The wire contract between the (future Rust) BFF and the web frontend,
//! expressed once as a schema IR and consumed two ways:
//!   - `emit`     → valibot TypeScript for the frontend,
//!   - `validate` → runtime validation on the server.

pub mod emit;
pub mod ir;
pub mod schemas;
pub mod validate;

pub use ir::{Decl, Module, Registry, Schema};
pub use schemas::registry;

/// The contract with every `NumArg::Const` (e.g. `MIN_PASSWORD_LENGTH`) resolved
/// to a literal, ready for `validate`. Codegen uses the raw `registry()` so it
/// can still emit the const *name*; runtime validation uses this.
pub fn registry_resolved() -> Registry {
    let mut reg = registry();
    // Two passes: collect const values first (immutable), then resolve.
    let snapshot = registry();
    for module in &mut reg.modules {
        for decl in &mut module.decls {
            if let Decl::Schema { schema, .. } = decl {
                validate::resolve_consts(&snapshot, schema);
            }
        }
    }
    reg
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn ok(name: &str, value: serde_json::Value) {
        let reg = registry_resolved();
        let r = validate::validate_named(&reg, name, &value);
        assert!(r.is_ok(), "{name} should accept {value}: {:?}", r.err());
    }

    fn rejects(name: &str, value: serde_json::Value) {
        let reg = registry_resolved();
        let r = validate::validate_named(&reg, name, &value);
        assert!(r.is_err(), "{name} should reject {value}");
    }

    #[test]
    fn create_task_request_accepts_valid() {
        ok(
            "createTaskRequestSchema",
            json!({
                "title": "쓰레기 버리기",
                "date": "2026-07-30",
                "startAt": "09:30",
                "durationMin": 30
            }),
        );
    }

    #[test]
    fn create_task_request_trims_and_defaults_project_id() {
        let reg = registry_resolved();
        let out = validate::validate_named(
            &reg,
            "createTaskRequestSchema",
            &json!({ "title": "  hi  ", "date": "2026-07-30", "startAt": "00:00", "durationMin": 1 }),
        )
        .unwrap();
        assert_eq!(out["title"], json!("hi"));
        assert_eq!(out["projectId"], json!(null)); // v.optional(..., null) default
    }

    #[test]
    fn create_task_request_rejects_blank_title() {
        rejects(
            "createTaskRequestSchema",
            json!({ "title": "   ", "date": "2026-07-30", "startAt": "09:30", "durationMin": 30 }),
        );
    }

    #[test]
    fn create_task_request_rejects_bad_date_time_and_duration() {
        rejects(
            "createTaskRequestSchema",
            json!({ "title": "x", "date": "2026-13-40", "startAt": "09:30", "durationMin": 1 }),
        );
        rejects(
            "createTaskRequestSchema",
            json!({ "title": "x", "date": "2026-07-30", "startAt": "25:00", "durationMin": 1 }),
        );
        rejects(
            "createTaskRequestSchema",
            json!({ "title": "x", "date": "2026-07-30", "startAt": "09:30", "durationMin": 0 }),
        );
        rejects(
            "createTaskRequestSchema",
            json!({ "title": "x", "date": "2026-07-30", "startAt": "09:30", "durationMin": 1.5 }),
        );
    }

    #[test]
    fn task_status_picklist() {
        ok("taskStatusSchema", json!("doing"));
        rejects("taskStatusSchema", json!("archived"));
    }

    #[test]
    fn update_task_patch_requires_at_least_one_field() {
        ok(
            "updateTaskRequestSchema",
            json!({ "id": "t1", "patch": { "status": "done" } }),
        );
        rejects(
            "updateTaskRequestSchema",
            json!({ "id": "t1", "patch": {} }),
        );
    }

    #[test]
    fn signup_uses_min_password_length_const() {
        ok(
            "signupRequestSchema",
            json!({ "email": "a@b.com", "password": "12345678", "name": "Kim" }),
        );
        rejects(
            "signupRequestSchema",
            json!({ "email": "a@b.com", "password": "1234567", "name": "Kim" }),
        );
        rejects(
            "signupRequestSchema",
            json!({ "email": "not-an-email", "password": "12345678", "name": "Kim" }),
        );
    }

    #[test]
    fn me_response_nullable_user() {
        ok("meResponseSchema", json!({ "user": null }));
        ok(
            "meResponseSchema",
            json!({ "user": { "id": "u1", "email": "a@b.com", "name": "Kim" } }),
        );
        rejects("meResponseSchema", json!({ "user": { "id": "u1" } }));
    }

    #[test]
    fn task_change_spreads_task_fields() {
        ok(
            "taskChangeSchema",
            json!({
                "id": "t1", "projectId": null, "title": "x", "date": "2026-07-30",
                "startAt": "09:30", "durationMin": 30, "status": "todo",
                "version": 1, "syncSeq": 5, "deleted": false
            }),
        );
        // missing spread-in field `version`
        rejects(
            "taskChangeSchema",
            json!({
                "id": "t1", "projectId": null, "title": "x", "date": "2026-07-30",
                "startAt": "09:30", "durationMin": 30, "status": "todo",
                "syncSeq": 5, "deleted": false
            }),
        );
    }

    #[test]
    fn object_strips_unknown_keys() {
        let reg = registry_resolved();
        let out = validate::validate_named(
            &reg,
            "taskIdRequestSchema",
            &json!({ "id": "t1", "extra": "ignored" }),
        )
        .unwrap();
        assert_eq!(out, json!({ "id": "t1" }));
    }
}
