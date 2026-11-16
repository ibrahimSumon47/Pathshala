import { getTranslations } from 'next-intl/server';
import type { UserRole } from '@pathshala/db';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { signOutAction } from '@/lib/auth/actions';
import { requireUser } from '@/lib/auth/guard';
import styles from './dashboard.module.css';

/** Signed-in home. Course progress and enrolments plug into the empty panel in P2. */
export default async function DashboardPage() {
  const user = await requireUser();
  const t = await getTranslations('Dashboard');
  const roles = await getTranslations('Roles');
  const roleLabel = (role: UserRole) => roles(role);

  return (
    <div className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>{t('eyebrow')}</p>
        <h1 className={styles.title}>{t('title')}</h1>

        <div className={styles.grid}>
          <Card className={styles.profile}>
            <p className={styles.name}>{user.name}</p>
            <p className={styles.email}>{user.email}</p>
            <p className={styles.rolesLabel}>{t('roles')}</p>
            <div className={styles.roles}>
              {user.roles.map((role) => (
                <Badge key={role} tone="accent">
                  {roleLabel(role)}
                </Badge>
              ))}
            </div>
            <form action={signOutAction} className={styles.signOut}>
              <button type="submit" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                {t('signOut')}
              </button>
            </form>
          </Card>

          <Card className={styles.panel}>
            <h2 className={styles.panelTitle}>{t('emptyTitle')}</h2>
            <p className={styles.panelBody}>{t('emptyBody')}</p>
            <div className={styles.actions}>
              <Link href="/courses" className={buttonStyles()}>
                {t('browse')}
              </Link>
              {user.roles.includes('admin') ? (
                <Link href="/admin" className={buttonStyles({ variant: 'secondary' })}>
                  {t('adminPanel')}
                </Link>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
