import type { UserRole } from '@pathshala/db';
import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { z } from 'zod';
import { authenticate } from '@/lib/auth/accounts';

/** Google is offered only when the owner has configured an OAuth client. */
export const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

const providers: NextAuthConfig['providers'] = [
  Credentials({
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    authorize: async (raw) => {
      const parsed = credentialsSchema.safeParse(raw);
      if (!parsed.success) return null;

      const user = await authenticate(parsed.data.email, parsed.data.password);
      if (!user) return null;

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: user.roles,
        locale: user.locale,
      };
    },
  }),
];

if (googleEnabled) {
  providers.push(Google);
}

const authSecret = process.env.AUTH_SECRET;
if (!authSecret && process.env.NODE_ENV === 'production') {
  throw new Error('AUTH_SECRET is required in production; see apps/web/.env.example.');
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Vercel terminates TLS in front of the function, so the forwarded host is trusted.
  trustHost: true,
  secret: authSecret ?? 'pathshala-local-development-only-secret',
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: '/sign-in' },
  providers,
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.roles = (user.roles as UserRole[] | undefined) ?? ['student'];
        token.locale = user.locale ?? 'bn';
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === 'string' ? token.id : (token.sub ?? '');
        session.user.roles = Array.isArray(token.roles) ? token.roles : ['student'];
      }
      return session;
    },
  },
});
