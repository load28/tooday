import type { User } from '@tooday/shared';

interface UserRecord extends User {
  passwordHash: string;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
}

export interface UserStore {
  create(input: CreateUserInput): Promise<User>;
  verifyCredentials(input: { email: string; password: string }): Promise<User | null>;
  findById(id: string): User | null;
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`이미 가입된 이메일입니다: ${email}`);
    this.name = 'DuplicateEmailError';
  }
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
      throw new DuplicateEmailError(normalizedEmail);
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

  findById(id: string): User | null {
    const record = this.byId.get(id);
    return record ? toUser(record) : null;
  }
}
