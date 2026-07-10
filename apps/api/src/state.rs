use std::sync::Arc;

use sqlx::PgPool;

use crate::auth::jwt::AccessTokens;
use crate::auth::refresh::RefreshStore;

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub tokens: Arc<AccessTokens>,
    pub refresh: RefreshStore,
}
