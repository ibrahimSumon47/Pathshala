import 'server-only';
import type { Locale } from '@pathshala/shared';
import type { UserRole } from '@pathshala/db';
import bcrypt from 'bcryptjs';
import { DEMO_ACCOUNTS, demoAuthEnabled } from './demo-accounts';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  locale: Locale;
};

type StoredUser = PublicUser & { passwordHash: string };

// bcrypt hashes of the public demo passwords above; generated once with cost 10.
const DEMO_HASHES: Record<string, string> = {
  'student@pathshala.dev': '$2b$10$4BV/E4MkmJgoW9KFxDQrXugLGeVtUpjSVrNSuuNQynaIUKTLL6kaq',
  'instructor@pathshala.dev': '$2b$10$MIxFtDABNO2BmG/WOS/y1uMsN0VW2PLUzr626crJu5gcnymF8F7fW',
  'admin@pathshala.dev': '$2b$10$/KV7QxcTwEPz3n7WcqyfcOCKkeFWNm1n177rckHovZvisY/fzrz9m',
};

/** Build a stored user from the public demo list and its hash. */
function demoUser(email: string): StoredUser | null {
  const account = DEMO_ACCOUNTS.find((candidate) => candidate.email === email);
  const passwordHash = DEMO_HASHES[email];
  if (!account || !passwordHash) return null;

  return {
    id: `demo:${account.role}`,
    name: account.name,
    email: account.email,
    roles: [account.role],
    locale: account.locale,
    passwordHash,
  };
}

/** Load a user from MongoDB when a URI is configured; models stay out of the client bundle. */
async function mongoUser(email: string): Promise<StoredUser | null> {
  const { User, connectToDatabase } = await import('@pathshala/db');
  await connectToDatabase();

  const document = await User.findOne({ email }).select('+passwordHash').lean();
  if (!document) return null;

  return {
    id: String(document._id),
    name: document.name,
    email: document.email,
    roles: document.roles,
    locale: document.locale,
    passwordHash: document.passwordHash ?? '',
  };
}

/** Find an account by email, preferring the database when it is configured. */
async function findStoredUser(email: string): Promise<StoredUser | null> {
  const normalized = email.trim().toLowerCase();

  if (process.env.MONGODB_URI) {
    return mongoUser(normalized);
  }

  return demoAuthEnabled() ? demoUser(normalized) : null;
}

/** Check a password and return only data that is safe to put in a session. */
export async function authenticate(email: string, password: string): Promise<PublicUser | null> {
  const stored = await findStoredUser(email);
  if (!stored?.passwordHash) return null;

  const matches = await bcrypt.compare(password, stored.passwordHash);
  if (!matches) return null;

  const { passwordHash: _passwordHash, ...publicUser } = stored;
  return publicUser;
}

/** List accounts for the admin overview; capped so the page cannot grow unbounded. */
export async function listAccounts(): Promise<PublicUser[]> {
  if (process.env.MONGODB_URI) {
    const { User, connectToDatabase } = await import('@pathshala/db');
    await connectToDatabase();
    const documents = await User.find().sort({ createdAt: -1 }).limit(50).lean();
    return documents.map((document) => ({
      id: String(document._id),
      name: document.name,
      email: document.email,
      roles: document.roles,
      locale: document.locale,
    }));
  }

  if (!demoAuthEnabled()) return [];
  return DEMO_ACCOUNTS.map(({ role, name, email, locale }) => ({
    id: `demo:${role}`,
    name,
    email,
    roles: [role],
    locale,
  }));
}
