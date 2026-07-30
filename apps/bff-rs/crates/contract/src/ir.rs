//! Schema IR — a Rust model of valibot's own vocabulary.
//!
//! The contract is expressed once, in this IR. From it we derive two things:
//!   1. valibot TypeScript source (see `emit.rs`) for the frontend,
//!   2. runtime validation on the Rust server (see `validate.rs`).
//!
//! We deliberately mirror valibot's *actions* (`trim`, `minLength`, `isoDate`,
//! `integer`, `minValue`, `check`), not just its types — those actions are the
//! contract, and a plain "struct → type" generator would drop them.

/// A number literal, or a reference to an emitted numeric const
/// (e.g. `v.minLength(MIN_PASSWORD_LENGTH)`).
#[derive(Clone, Debug)]
pub enum NumArg {
    Lit(f64),
    Const(&'static str),
}

impl NumArg {
    /// Resolve to an actual number, following const references against the registry.
    pub fn resolve(&self, reg: &Registry) -> f64 {
        match self {
            NumArg::Lit(n) => *n,
            NumArg::Const(name) => reg.num_const(name).unwrap_or_else(|| {
                panic!("NumArg::Const references unknown numeric const `{name}`")
            }),
        }
    }
}

impl From<f64> for NumArg {
    fn from(n: f64) -> Self {
        NumArg::Lit(n)
    }
}
impl From<i64> for NumArg {
    fn from(n: i64) -> Self {
        NumArg::Lit(n as f64)
    }
}

#[derive(Clone, Debug)]
pub enum StringAction {
    Trim,
    MinLength(NumArg),
    MaxLength(NumArg),
    NonEmpty,
    Email,
    IsoDate,
    IsoTime,
}

#[derive(Clone, Debug)]
pub enum NumberAction {
    Integer,
    MinValue(NumArg),
    MaxValue(NumArg),
}

/// A `v.check((param) => body, message)` refinement piped onto a schema.
#[derive(Clone, Debug)]
pub struct Check {
    pub param: &'static str,
    /// JS expression evaluated against `param`; must return a boolean.
    pub body: &'static str,
    pub message: &'static str,
    /// A Rust predicate mirroring `body`, used by runtime validation.
    pub predicate: fn(&serde_json::Value) -> bool,
}

#[derive(Clone, Debug)]
pub enum Default {
    Null,
}

#[derive(Clone, Debug)]
pub enum Schema {
    String(Vec<StringAction>),
    Number(Vec<NumberAction>),
    Boolean,
    /// `v.picklist(CONST)` — references an emitted `as const` string array.
    PicklistConst(&'static str),
    /// A reference to another named schema const (same or sibling module).
    Ref(&'static str),
    Array(Box<Schema>),
    Nullable(Box<Schema>),
    Optional(Box<Schema>, Option<Default>),
    Object(ObjectSchema),
    /// `v.pipe(<inner>, v.check(...))`.
    Checked(Box<Schema>, Check),
}

#[derive(Clone, Debug)]
pub struct ObjectSchema {
    pub items: Vec<ObjectItem>,
}

#[derive(Clone, Debug)]
pub enum ObjectItem {
    Field {
        name: &'static str,
        doc: Option<&'static str>,
        schema: Schema,
    },
    /// `...<ref>.entries`
    Spread(&'static str),
}

// ---------------------------------------------------------------------------
// Fluent builder — keeps `schemas/` reading almost like the valibot it emits.
// ---------------------------------------------------------------------------

pub fn string() -> Schema {
    Schema::String(vec![])
}
pub fn number() -> Schema {
    Schema::Number(vec![])
}
pub fn boolean() -> Schema {
    Schema::Boolean
}
pub fn picklist(const_name: &'static str) -> Schema {
    Schema::PicklistConst(const_name)
}
pub fn r#ref(name: &'static str) -> Schema {
    Schema::Ref(name)
}
pub fn array(inner: Schema) -> Schema {
    Schema::Array(Box::new(inner))
}
pub fn object(items: Vec<ObjectItem>) -> Schema {
    Schema::Object(ObjectSchema { items })
}

pub fn field(name: &'static str, schema: Schema) -> ObjectItem {
    ObjectItem::Field {
        name,
        doc: None,
        schema,
    }
}
pub fn field_doc(name: &'static str, doc: &'static str, schema: Schema) -> ObjectItem {
    ObjectItem::Field {
        name,
        doc: Some(doc),
        schema,
    }
}
pub fn spread(ref_name: &'static str) -> ObjectItem {
    ObjectItem::Spread(ref_name)
}

impl Schema {
    // String actions
    pub fn trim(mut self) -> Self {
        self.push_str_action(StringAction::Trim);
        self
    }
    pub fn min_length(mut self, n: impl Into<NumArg>) -> Self {
        self.push_str_action(StringAction::MinLength(n.into()));
        self
    }
    pub fn max_length(mut self, n: impl Into<NumArg>) -> Self {
        self.push_str_action(StringAction::MaxLength(n.into()));
        self
    }
    pub fn non_empty(mut self) -> Self {
        self.push_str_action(StringAction::NonEmpty);
        self
    }
    pub fn email(mut self) -> Self {
        self.push_str_action(StringAction::Email);
        self
    }
    pub fn iso_date(mut self) -> Self {
        self.push_str_action(StringAction::IsoDate);
        self
    }
    pub fn iso_time(mut self) -> Self {
        self.push_str_action(StringAction::IsoTime);
        self
    }

    // Number actions
    pub fn integer(mut self) -> Self {
        self.push_num_action(NumberAction::Integer);
        self
    }
    pub fn min_value(mut self, n: impl Into<NumArg>) -> Self {
        self.push_num_action(NumberAction::MinValue(n.into()));
        self
    }
    pub fn max_value(mut self, n: impl Into<NumArg>) -> Self {
        self.push_num_action(NumberAction::MaxValue(n.into()));
        self
    }

    // Wrappers
    pub fn nullable(self) -> Self {
        Schema::Nullable(Box::new(self))
    }
    pub fn optional(self) -> Self {
        Schema::Optional(Box::new(self), None)
    }
    pub fn optional_default(self, d: Default) -> Self {
        Schema::Optional(Box::new(self), Some(d))
    }
    pub fn checked(self, check: Check) -> Self {
        Schema::Checked(Box::new(self), check)
    }

    fn push_str_action(&mut self, action: StringAction) {
        match self {
            Schema::String(actions) => actions.push(action),
            _ => panic!("string action applied to non-string schema: {self:?}"),
        }
    }
    fn push_num_action(&mut self, action: NumberAction) {
        match self {
            Schema::Number(actions) => actions.push(action),
            _ => panic!("number action applied to non-number schema: {self:?}"),
        }
    }
}

// ---------------------------------------------------------------------------
// Declarations, modules, registry
// ---------------------------------------------------------------------------

#[derive(Clone, Debug)]
pub enum Decl {
    /// `export const NAME = ['a', 'b'] as const;`
    ConstStrArray {
        name: &'static str,
        doc: Option<&'static str>,
        values: Vec<&'static str>,
    },
    /// `export const NAME = 8;`
    ConstNum {
        name: &'static str,
        doc: Option<&'static str>,
        value: f64,
    },
    /// `export const NAME = '/sync/events';`
    ConstStr {
        name: &'static str,
        doc: Option<&'static str>,
        value: &'static str,
    },
    /// `[export] const nameSchema = <schema>;` (+ optional `export type Ty = InferOutput<...>`)
    Schema {
        name: &'static str,
        doc: Option<&'static str>,
        exported: bool,
        schema: Schema,
        ty: Option<&'static str>,
    },
}

impl Decl {
    pub fn name(&self) -> &'static str {
        match self {
            Decl::ConstStrArray { name, .. }
            | Decl::ConstNum { name, .. }
            | Decl::ConstStr { name, .. }
            | Decl::Schema { name, .. } => name,
        }
    }
}

/// Convenience constructors for declarations.
pub fn const_str_array(name: &'static str, values: Vec<&'static str>) -> Decl {
    Decl::ConstStrArray {
        name,
        doc: None,
        values,
    }
}
pub fn const_num(name: &'static str, value: impl Into<f64>) -> Decl {
    Decl::ConstNum {
        name,
        doc: None,
        value: value.into(),
    }
}
pub fn const_str(name: &'static str, doc: &'static str, value: &'static str) -> Decl {
    Decl::ConstStr {
        name,
        doc: Some(doc),
        value,
    }
}
/// Exported schema const with a derived `export type`.
pub fn schema(name: &'static str, ty: &'static str, schema: Schema) -> Decl {
    Decl::Schema {
        name,
        doc: None,
        exported: true,
        schema,
        ty: Some(ty),
    }
}
/// Exported schema const with a doc comment and a derived `export type`.
pub fn schema_doc(name: &'static str, doc: &'static str, ty: &'static str, schema: Schema) -> Decl {
    Decl::Schema {
        name,
        doc: Some(doc),
        exported: true,
        schema,
        ty: Some(ty),
    }
}
/// Module-private schema const (no export, no type) — e.g. `isoDateSchema`.
pub fn schema_private(name: &'static str, schema: Schema) -> Decl {
    Decl::Schema {
        name,
        doc: None,
        exported: false,
        schema,
        ty: None,
    }
}

pub struct Module {
    /// File basename under `generated/`, e.g. `"task"` → `task.ts`.
    pub name: &'static str,
    pub decls: Vec<Decl>,
}

pub struct Registry {
    pub modules: Vec<Module>,
}

impl Registry {
    /// Which module declares `name`, if any.
    pub fn module_of(&self, name: &str) -> Option<&'static str> {
        for m in &self.modules {
            if m.decls.iter().any(|d| d.name() == name) {
                return Some(m.name);
            }
        }
        None
    }

    pub fn decl(&self, name: &str) -> Option<&Decl> {
        self.modules
            .iter()
            .flat_map(|m| &m.decls)
            .find(|d| d.name() == name)
    }

    pub fn num_const(&self, name: &str) -> Option<f64> {
        match self.decl(name) {
            Some(Decl::ConstNum { value, .. }) => Some(*value),
            _ => None,
        }
    }

    pub fn str_array_const(&self, name: &str) -> Option<&[&'static str]> {
        match self.decl(name) {
            Some(Decl::ConstStrArray { values, .. }) => Some(values),
            _ => None,
        }
    }

    /// The schema behind a named schema const (following `Decl::Schema`).
    pub fn schema_of(&self, name: &str) -> Option<&Schema> {
        match self.decl(name) {
            Some(Decl::Schema { schema, .. }) => Some(schema),
            _ => None,
        }
    }
}
