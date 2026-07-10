import type { UserReader } from '@bff/modules/user/ports';
import type { ApiClient } from '@bff/platform/api-client';
import { ApiRequestError } from '@bff/platform/api-client';
import type { User } from '@tooday/shared';

/** 읽기 전용 — users 데이터의 실제 소유·쓰기는 러스트 API의 auth 흐름에 있다 */
export class HttpUserReader implements UserReader {
  constructor(private readonly api: ApiClient) {}

  async findById(id: string): Promise<User | null> {
    try {
      const { user } = await this.api.request<{ user: User }>({ method: 'GET', path: `/internal/users/${id}` });
      return user;
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) return null;
      throw error;
    }
  }
}
