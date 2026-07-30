//! Mirror of `packages/shared/src/task.ts`.

use crate::ir::*;
use serde_json::Value;

/// `Object.values(patch).some((value) => value !== undefined)` — after parsing,
/// only present keys remain, so this means "the patch has at least one field".
fn patch_has_a_field(patch: &Value) -> bool {
    patch.as_object().map(|o| !o.is_empty()).unwrap_or(false)
}

pub fn module() -> Module {
    // Private, reused primitives (not exported) — mirror of task.ts.
    let iso_date = Decl::Schema {
        name: "isoDateSchema",
        doc: Some(
            "'YYYY-MM-DD' — 시간대 없는 사용자 로컬 캘린더 날짜. 문자열 비교가 곧 날짜 비교다.",
        ),
        exported: false,
        schema: string().iso_date(),
        ty: None,
    };
    let iso_time = Decl::Schema {
        name: "isoTimeSchema",
        doc: Some("'HH:mm'"),
        exported: false,
        schema: string().iso_time(),
        ty: None,
    };

    Module {
        name: "task",
        decls: vec![
            const_str_array("TASK_STATUSES", vec!["todo", "doing", "done"]),
            schema("taskStatusSchema", "TaskStatus", picklist("TASK_STATUSES")),
            const_str_array(
                "PROJECT_COLORS",
                vec!["blue", "mint", "violet", "amber", "pink", "gray"],
            ),
            schema(
                "projectColorSchema",
                "ProjectColor",
                picklist("PROJECT_COLORS"),
            ),
            iso_date,
            iso_time,
            schema(
                "projectSchema",
                "Project",
                object(vec![
                    field("id", string()),
                    field("name", string()),
                    field("color", r#ref("projectColorSchema")),
                ]),
            ),
            schema(
                "taskSchema",
                "Task",
                object(vec![
                    field("id", string()),
                    field("projectId", string().nullable()),
                    field("title", string()),
                    field("date", r#ref("isoDateSchema")),
                    field("startAt", r#ref("isoTimeSchema")),
                    field("durationMin", number().integer().min_value(1)),
                    field("status", r#ref("taskStatusSchema")),
                    field_doc(
                        "version",
                        "행 변경 카운터 — 쓰기마다 서버가 +1 (캐시 검증·디버깅용).\n낙관적 잠금이 아니다: 쓰기 요청은 version을 보내지 않고 서버도 비교하지 않는다.\n동시 쓰기 수렴은 필드 단위 LWW(taskPatchSchema 참고)로 한다 — 409 없음.",
                        number().integer().min_value(1),
                    ),
                ]),
            ),
            schema(
                "taskRangeRequestSchema",
                "TaskRangeRequest",
                object(vec![
                    field("from", r#ref("isoDateSchema")),
                    field("to", r#ref("isoDateSchema")),
                ]),
            ),
            schema_doc(
                "taskRangeResponseSchema",
                "메인(오늘) 화면 한 번의 조회로 주간 창의 태스크·프로젝트 라벨과\n동기화 커서(이 유저의 현재 sync seq)를 함께 내려준다.",
                "TaskRangeResponse",
                object(vec![
                    field("tasks", array(r#ref("taskSchema"))),
                    field("projects", array(r#ref("projectSchema"))),
                    field("cursor", number().integer().min_value(0)),
                ]),
            ),
            schema(
                "createTaskRequestSchema",
                "CreateTaskRequest",
                object(vec![
                    field("title", string().trim().min_length(1)),
                    field("projectId", string().nullable().optional_default(Default::Null)),
                    field("date", r#ref("isoDateSchema")),
                    field("startAt", r#ref("isoTimeSchema")),
                    field("durationMin", number().integer().min_value(1)),
                ]),
            ),
            schema_doc(
                "taskPatchSchema",
                "의도(intent) 기반 부분 업데이트 — 바꾸려는 필드만 보낸다.\n서버는 최신 행에 이 필드들만 적용하므로(필드 단위 LWW) 행 전체 덮어쓰기가 없고,\n같은 필드를 두 기기가 고치면 나중 의도가 이긴다. 409는 발생하지 않는다.",
                "TaskPatch",
                object(vec![
                    field("title", string().trim().min_length(1).optional()),
                    field("projectId", string().nullable().optional()),
                    field("date", r#ref("isoDateSchema").optional()),
                    field("startAt", r#ref("isoTimeSchema").optional()),
                    field("durationMin", number().integer().min_value(1).optional()),
                    field("status", r#ref("taskStatusSchema").optional()),
                ]),
            ),
            schema(
                "updateTaskRequestSchema",
                "UpdateTaskRequest",
                object(vec![
                    field("id", string()),
                    field(
                        "patch",
                        r#ref("taskPatchSchema").checked(Check {
                            param: "patch",
                            body: "Object.values(patch).some((value) => value !== undefined)",
                            message: "patch에 바꿀 필드가 최소 하나 필요합니다",
                            predicate: patch_has_a_field,
                        }),
                    ),
                ]),
            ),
            schema_doc(
                "syncChangesRequestSchema",
                "델타 동기화 — 커서(마지막으로 본 sync seq) 이후 바뀐 행을 전부 내려준다. tombstone 포함",
                "SyncChangesRequest",
                object(vec![field("cursor", number().integer().min_value(0))]),
            ),
            schema(
                "taskChangeSchema",
                "TaskChange",
                object(vec![
                    spread("taskSchema"),
                    field("syncSeq", number().integer().min_value(1)),
                    field("deleted", boolean()),
                ]),
            ),
            schema(
                "projectChangeSchema",
                "ProjectChange",
                object(vec![
                    spread("projectSchema"),
                    field("syncSeq", number().integer().min_value(1)),
                    field("deleted", boolean()),
                ]),
            ),
            schema(
                "syncChangesResponseSchema",
                "SyncChangesResponse",
                object(vec![
                    field("tasks", array(r#ref("taskChangeSchema"))),
                    field("projects", array(r#ref("projectChangeSchema"))),
                    field_doc(
                        "cursor",
                        "다음 요청에 쓸 커서 — max(요청 커서, 반환된 변경의 최대 seq)",
                        number().integer().min_value(0),
                    ),
                ]),
            ),
            const_str(
                "SYNC_EVENTS_PATH",
                "SSE 신호 채널 경로 — 데이터는 싣지 않고 \"네 데이터 바뀜\"만 알린다. 클라이언트는 신호를 받으면 델타를 당긴다",
                "/sync/events",
            ),
            schema_doc(
                "taskIdRequestSchema",
                "단건 조회·삭제 요청 — 태스크 id만",
                "TaskIdRequest",
                object(vec![field("id", string())]),
            ),
            schema(
                "createProjectRequestSchema",
                "CreateProjectRequest",
                object(vec![
                    field("name", string().trim().min_length(1)),
                    field("color", r#ref("projectColorSchema")),
                ]),
            ),
            schema_doc(
                "projectDetailRequestSchema",
                "프로젝트 상세(보드) 요청 — 프로젝트 id",
                "ProjectDetailRequest",
                object(vec![field("projectId", string())]),
            ),
            schema_doc(
                "projectSummarySchema",
                "프로젝트 목록 화면용 요약 — 프로젝트 라벨에 진행률(완료/전체 태스크 수)을 얹는다.\n카운트는 삭제되지 않은 태스크 기준이며 서버가 집계해 내려준다.",
                "ProjectSummary",
                object(vec![
                    spread("projectSchema"),
                    field("totalCount", number().integer().min_value(0)),
                    field("doneCount", number().integer().min_value(0)),
                ]),
            ),
            schema(
                "projectListResponseSchema",
                "ProjectListResponse",
                object(vec![field("projects", array(r#ref("projectSummarySchema")))]),
            ),
            schema_doc(
                "projectDetailResponseSchema",
                "프로젝트 상세 — 프로젝트 라벨과 그 프로젝트에 속한 태스크 전부(상태 무관)",
                "ProjectDetailResponse",
                object(vec![
                    field("project", r#ref("projectSchema")),
                    field("tasks", array(r#ref("taskSchema"))),
                ]),
            ),
        ],
    }
}
