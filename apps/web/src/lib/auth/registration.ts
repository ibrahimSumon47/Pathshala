import 'server-only';
import bcrypt from 'bcryptjs';
import { User, connectToDatabase } from '@pathshala/db';
import { z } from 'zod';

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(12).max(72),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type RegistrationResult = { ok: true } | { ok: false; code: 'invalid' | 'exists' };

/** Validate fields, hash the password and create a student account atomically by unique email. */
export async function registerStudent(input: unknown): Promise<RegistrationResult> {
  const parsed = registrationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: 'invalid' };
  await connectToDatabase();
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  try {
    await User.create({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      roles: ['student'],
      locale: 'bn',
      emailVerified: null,
    });
    return { ok: true };
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return { ok: false, code: 'exists' };
    }
    throw error;
  }
}
