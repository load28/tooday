import type { User } from '@tooday/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type AuthData, type AuthTransport, createAuthData } from '@/entities/auth/data';

const user: User = { id: 'u1', email: 'one@example.com', name: '하나' };
const resources: AuthData[] = [];
function setup(overrides: Partial<AuthTransport> = {}) {
  const transport: AuthTransport = {
    me: vi.fn(async () => ({ user: null })),
    login: vi.fn(async () => user),
    signup: vi.fn(async () => user),
    logout: vi.fn(async () => {}),
    clearUserData: vi.fn(async () => {}),
    ...overrides,
  };
  const data = createAuthData(transport);
  resources.push(data);
  return { data, transport };
}
afterEach(async () => {
  await Promise.all(resources.splice(0).map((data) => data.dispose()));
});

describe('인증 DB와 업무 액션', () => {
  it('익명 → 로그인 → 로그아웃을 동일한 DB 뷰에 반영하고 사용자 데이터를 정리한다', async () => {
    const { data, transport } = setup();
    expect(await data.resolveUser()).toBeNull();
    const view = data.sessionView();
    const subscription = view.subscribeChanges(() => {});
    try {
      await data.actions.login({ email: user.email, password: 'password' });
      await vi.waitFor(() => expect([...view.values()][0]?.user).toEqual(user));
      expect(await data.resolveUser()).toEqual(user);
      await data.actions.logout();
      await vi.waitFor(() => expect([...view.values()][0]?.user).toBeNull());
      expect(await data.resolveUser()).toBeNull();
      expect(transport.clearUserData).toHaveBeenCalledTimes(2);
      expect(transport.me).toHaveBeenCalledTimes(1);
    } finally {
      subscription.unsubscribe();
    }
  });
  it('로그아웃 실패는 로그인 사용자와 데이터를 지우지 않는다', async () => {
    const { data, transport } = setup({
      me: async () => ({ user }),
      logout: async () => {
        throw new Error('offline');
      },
    });
    await data.resolveUser();
    vi.mocked(transport.clearUserData).mockClear();
    await expect(data.actions.logout()).rejects.toThrow('offline');
    expect(await data.resolveUser()).toEqual(user);
    expect(transport.clearUserData).not.toHaveBeenCalled();
  });
  it('세션 종료 뒤 도착한 로그인 응답은 사용자를 복원하지 않는다', async () => {
    let resolve!: (user: User) => void;
    const { data } = setup({
      login: () =>
        new Promise((done) => {
          resolve = done;
        }),
    });
    await data.resolveUser();
    const pending = data.actions.login({ email: user.email, password: 'password' });
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await data.clear();
    resolve(user);
    await rejected;
    expect(await data.resolveUser()).toBeNull();
  });
  it('SSR 복원 후 같은 사용자 데이터를 추가 요청 없이 읽는다', async () => {
    const server = setup({ me: async () => ({ user }) });
    await server.data.resolveUser();
    const client = setup();
    client.data.hydrate(server.data.dehydrate());
    expect(await client.data.resolveUser()).toEqual(user);
    expect([...client.data.sessionView().values()][0]?.user).toEqual(user);
    expect(client.transport.me).not.toHaveBeenCalled();
  });
  it('네트워크 실패를 익명 사용자로 오인하지 않고 호출자에게 전달한다', async () => {
    const { data } = setup({
      me: async () => {
        throw new Error('offline');
      },
    });
    await expect(data.resolveUser()).rejects.toThrow('offline');
  });
});
