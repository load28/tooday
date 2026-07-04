import type { CreateUserInput, Session, SessionStore, SessionWithUser, UserStore } from '@bff/modules/auth/ports';
import { generateSessionToken } from '@bff/modules/auth/session-token';
import { DOMAIN_ERROR_CODES, DomainError } from '@bff/platform/errors';
import { newId } from '@bff/platform/ids';
import type { User } from '@tooday/shared';

interface UserRecord extends User {
  passwordHash: string;
}

function toUser({ id, email, name }: UserRecord): User {
  return { id, email, name };
}

export class InMemoryUserStore implements UserStore {
  private readonly byId = new Map<string, UserRecord>();
  private readonly idByEmail = new Map<string, string>();

  async create({ email, password, name }: CreateUserInput): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    if (this.idByEmail.has(normalizedEmail)) {
      throw new DomainError(DOMAIN_ERROR_CODES.EMAIL_TAKEN);
    }
    const record: UserRecord = {
      id: newId(),
      email: normalizedEmail,
      name,
      passwordHash: await Bun.password.hash(password),
    };
    this.byId.set(record.id, record);
    this.idByEmail.set(normalizedEmail, record.id);
    return toUser(record);
  }

  async verifyCredentials({ email, password }: { email: string; password: string }): Promise<User | null> {
    const id = this.idByEmail.get(email.trim().toLowerCase());
    const record = id ? this.byId.get(id) : undefined;
    if (!record) return null;
    const valid = await Bun.password.verify(password, record.passwordHash);
    return valid ? toUser(record) : null;
  }

  async findById(id: string): Promise<User | null> {
    const record = this.byId.get(id);
    return record ? toUser(record) : null;
  }
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();
  private readonly ttlMs: number;
  private readonly users: UserStore;

  constructor({ ttlMs, users }: { ttlMs: number; users: UserStore }) {
    this.ttlMs = ttlMs;
    this.users = users;
  }

  async create(userId: string): Promise<Session> {
    const session: Session = {
      token: generateSessionToken(),
      userId,
      expiresAt: Date.now() + this.ttlMs,
    };
    this.sessions.set(session.token, session);
    return session;
  }

  async get(token: string): Promise<Session | null> {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
      this.sessions.delete(token);
      return null;
    }
    return session;
  }

  async getWithUser(token: string): Promise<SessionWithUser | null> {
    const session = await this.get(token);
    if (!session) return null;
    const user = await this.users.findById(session.userId);
    return user ? { session, user } : null;
  }

  async revoke(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async deleteExpired(): Promise<number> {
    const now = Date.now();
    let deleted = 0;
    for (const [token, session] of this.sessions) {
      if (session.expiresAt <= now) {
        this.sessions.delete(token);
        deleted += 1;
      }
    }
    return deleted;
  }
}
