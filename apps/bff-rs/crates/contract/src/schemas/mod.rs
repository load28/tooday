//! The contract itself — one module per file under `packages/shared/src/`.
//! Order mirrors the barrel in `packages/shared/src/index.ts`.

pub mod auth;
pub mod pub_;
pub mod task;
pub mod user;

use crate::ir::Registry;

/// The whole contract, ready for codegen or runtime validation.
pub fn registry() -> Registry {
    Registry {
        modules: vec![
            auth::module(),
            pub_::module(),
            task::module(),
            user::module(),
        ],
    }
}
