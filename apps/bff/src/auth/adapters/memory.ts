import type { User } from '@tooday/shared';
import { DomainError } from '../../errors';
import type { CreateUserInput, Session, SessionStore, UserStore } from '../ports';

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
      throw new DomainError('EMAIL_TAKEN');
    }
    const record: UserRecord = {
      id: crypto.randomUUID(),
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

function generateToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, Session>();

  constructor(private readonly ttlMs: number) {}

  async create(userId: string): Promise<Session> {
    const session: Session = {
      token: generateToken(),
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

  async revoke(token: string): Promise<void> {
    this.sessions.delete(token);
  }
}
