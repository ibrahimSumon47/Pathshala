import { getTranslations } from 'next-intl/server';
import type { UserRole } from '@pathshala/db';
import { listAccounts } from '@/lib/auth/accounts';
import { requireRole } from '@/lib/auth/guard';
import styles from './admin.module.css';

/** Admin-only overview. Moderation actions arrive with the course workflow. */
export default async function AdminPage() {
  await requireRole('admin');
  const t = await getTranslations('Admin');
  const roles = await getTranslations('Roles');
  const accounts = await listAccounts();
  const roleLabel = (role: UserRole) => roles(role);

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lede}>{t('lede')}</p>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('name')}</th>
                <th scope="col">{t('email')}</th>
                <th scope="col">{t('roles')}</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td className={styles.email}>{account.email}</td>
                  <td>{account.roles.map(roleLabel).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length === 0 ? <p className={styles.empty}>{t('empty')}</p> : null}
        </div>
      </div>
    </div>
  );
}
