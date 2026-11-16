import { getTranslations } from 'next-intl/server';
import type { UserRole } from '@pathshala/db';
import { listCategories } from '@pathshala/db';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { listAccounts } from '@/lib/auth/accounts';
import { requireRole } from '@/lib/auth/guard';
import { createCategoryAction } from './actions';
import styles from './admin.module.css';

type AdminPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

/** Admin-only overview: accounts, subject taxonomy and the moderation entry points. */
export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const { locale } = await params;
  const { error, saved } = await searchParams;
  await requireRole('admin');
  const t = await getTranslations('Admin');
  const roles = await getTranslations('Roles');
  const [accounts, categories] = await Promise.all([listAccounts(), listCategories()]);
  const roleLabel = (role: UserRole) => roles(role);

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lede}>{t('lede')}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">{locale === 'en' ? 'Category added.' : 'বিষয় যোগ হয়েছে।'}</Alert> : null}

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

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{locale === 'en' ? 'Subjects' : 'বিষয়সমূহ'}</h2>
          <ul className={styles.categoryList}>
            {categories.map((category) => (
              <li key={category.id}>
                <span>{category.name[locale === 'en' ? 'en' : 'bn'] ?? category.name.en}</span>
                <code>{category.slug}</code>
              </li>
            ))}
          </ul>
          <form action={createCategoryAction} className={styles.form}>
            <input type="hidden" name="locale" value={locale} />
            <div className={styles.two}>
              <Field id="nameBn" name="nameBn" label="বাংলা নাম" required minLength={2} />
              <Field id="nameEn" name="nameEn" label="English name" required minLength={2} />
            </div>
            <div className={styles.two}>
              <Field id="slug" name="slug" label="Slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
              <Field id="order" name="order" label={locale === 'en' ? 'Order' : 'ক্রম'} type="number" min={0} defaultValue={categories.length + 1} />
            </div>
            <Button type="submit">{locale === 'en' ? 'Add subject' : 'বিষয় যোগ করুন'}</Button>
          </form>
        </section>
      </div>
    </div>
  );
}
