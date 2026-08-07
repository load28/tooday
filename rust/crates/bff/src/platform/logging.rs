use std::sync::Arc;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogFormat {
    Json,
    Pretty,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LogLevel {
    Info,
    Warn,
    Error,
}

impl LogLevel {
    fn as_str(self) -> &'static str {
        match self {
            LogLevel::Info => "info",
            LogLevel::Warn => "warn",
            LogLevel::Error => "error",
        }
    }
}

/// 구조화 로그 필드 — TS의 `Record<string, unknown>` 대응
pub type Fields = Vec<(&'static str, serde_json::Value)>;

pub trait Log: Send + Sync {
    fn log(&self, level: LogLevel, message: &str, fields: Fields);

    fn info(&self, message: &str, fields: Fields) {
        self.log(LogLevel::Info, message, fields);
    }
    fn warn(&self, message: &str, fields: Fields) {
        self.log(LogLevel::Warn, message, fields);
    }
    fn error(&self, message: &str, fields: Fields) {
        self.log(LogLevel::Error, message, fields);
    }
}

pub type Logger = Arc<dyn Log>;

pub struct ConsoleLogger {
    format: LogFormat,
}

impl Log for ConsoleLogger {
    fn log(&self, level: LogLevel, message: &str, fields: Fields) {
        let rendered = match self.format {
            LogFormat::Json => {
                let mut map = serde_json::Map::new();
                map.insert("level".into(), level.as_str().into());
                map.insert("time".into(), chrono::Utc::now().to_rfc3339().into());
                map.insert("message".into(), message.into());
                for (key, value) in fields {
                    map.insert(key.to_owned(), value);
                }
                serde_json::Value::Object(map).to_string()
            }
            LogFormat::Pretty => {
                let tail: Vec<String> = fields
                    .into_iter()
                    .map(|(key, value)| match value {
                        serde_json::Value::String(text) => format!("{key}={text}"),
                        other => format!("{key}={other}"),
                    })
                    .collect();
                if tail.is_empty() {
                    format!("[{}] {message}", level.as_str())
                } else {
                    format!("[{}] {message} {}", level.as_str(), tail.join(" "))
                }
            }
        };
        if matches!(level, LogLevel::Error) {
            eprintln!("{rendered}");
        } else {
            println!("{rendered}");
        }
    }
}

pub fn create_logger(format: LogFormat) -> Logger {
    Arc::new(ConsoleLogger { format })
}

/// 로그를 버리는 구현 — 테스트에서 소음을 없앤다
pub struct NoopLogger;

impl Log for NoopLogger {
    fn log(&self, _level: LogLevel, _message: &str, _fields: Fields) {}
}

pub const REQUEST_ID_HEADER: &str = "x-request-id";
