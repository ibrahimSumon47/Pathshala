import type { Locale } from '@pathshala/shared';
import type { UserRole } from '@pathshala/db';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      roles: UserRole[];
    } & DefaultSession['user'];
  }

  interface User {
    roles?: UserRole[];
    locale?: Locale;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    roles?: UserRole[];
    locale?: Locale;
  }
}
