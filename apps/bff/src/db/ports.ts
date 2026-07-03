export type SqlValue = string | number | null;

/**
 * DB 엔진 계약. 스토어는 이 인터페이스와 표준 SQL에만 의존한다.
 * 엔진 교체(sqlite → postgres 등)는 이 포트의 새 구현체 추가로 끝난다.
 */
export interface SqlDatabase {
  query(sql: string, params?: readonly SqlValue[]): Promise<unknown[]>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
}
