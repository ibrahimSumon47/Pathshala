import { listSavedSearches } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { requireUser } from '@/lib/auth/guard';
import { checkSavedSearchesAction, createSavedSearchAction, deleteSavedSearchAction } from './actions';
import styles from './saved-searches.module.css';

type SavedSearchesProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string; checked?: string }>;
};

const COPY = {
  bn: {
    eyebrow: 'আপনার অ্যাকাউন্ট',
    title: 'সংরক্ষিত খোঁজ',
    lede: 'পছন্দের ফিল্টার সংরক্ষণ করুন। নতুন কোর্স মিললে ইনবক্সে জানানো হবে।',
    create: 'নতুন খোঁজ',
    label: 'নাম',
    query: 'কী খুঁজছেন',
    level: 'স্তর',
    anyLevel: 'সব স্তর',
    language: 'ভাষা',
    anyLanguage: 'সব ভাষা',
    maxPrice: 'সর্বোচ্চ দাম (৳, ০ = সীমা নেই)',
    save: 'সংরক্ষণ করুন',
    list: 'সংরক্ষিত তালিকা',
    empty: 'এখনো কিছু সংরক্ষণ করেননি।',
    check: 'নতুন কোর্স দেখুন',
    remove: 'মুছুন',
    open: 'ক্যাটালগে দেখুন',
    last: 'শেষ দেখা',
    found: (count: string) => `${count}টি নতুন কোর্স পাওয়া গেছে।`,
    saved: 'সংরক্ষিত হয়েছে।',
    limit: 'সর্বোচ্চ ১০টি খোঁজ রাখা যায়।',
  },
  en: {
    eyebrow: 'Your account',
    title: 'Saved searches',
    lede: 'Keep the filters you use and get an inbox note when new courses match.',
    create: 'New saved search',
    label: 'Name',
    query: 'What are you looking for',
    level: 'Level',
    anyLevel: 'Any level',
    language: 'Language',
    anyLanguage: 'Any language',
    maxPrice: 'Maximum price (BDT, 0 = no limit)',
    save: 'Save search',
    list: 'Your searches',
    empty: 'Nothing saved yet.',
    check: 'Check for new courses',
    remove: 'Remove',
    open: 'Open in catalogue',
    last: 'Last checked',
    found: (count: string) => `${count} new course${count === '1' ? '' : 's'} found.`,
    saved: 'Saved.',
    limit: 'Ten saved searches is the limit.',
  },
} as const;

/** Learner saved searches with a manual check that writes one inbox note per match. */
export default async function SavedSearchesPage({ params, searchParams }: SavedSearchesProps) {
  const { locale } = await params;
  const { error, saved, checked } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  const user = await requireUser();
  const searches = await listSavedSearches(user.id);

  return (
    <div className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">{copy.saved}</Alert> : null}
        {checked !== undefined ? <Alert tone="success">{copy.found(checked)}</Alert> : null}

        <Card className={styles.formCard}>
          <h2>{copy.create}</h2>
          <form action={createSavedSearchAction} className={styles.form}>
            <input type="hidden" name="locale" value={locale} />
            <Field id="search-label" name="label" label={copy.label} required minLength={1} maxLength={80} />
            <Field id="search-query" name="query" label={copy.query} maxLength={80} />
            <div className={styles.row}>
              <Select
                id="search-level"
                name="level"
                label={copy.level}
                defaultValue=""
                options={[
                  { value: '', label: copy.anyLevel },
                  { value: 'beginner', label: language === 'en' ? 'Beginner' : 'শুরুর স্তর' },
                  { value: 'intermediate', label: language === 'en' ? 'Intermediate' : 'মধ্যম' },
                  { value: 'advanced', label: language === 'en' ? 'Advanced' : 'উন্নত' },
                ]}
              />
              <Select
                id="search-language"
                name="language"
                label={copy.language}
                defaultValue=""
                options={[
                  { value: '', label: copy.anyLanguage },
                  { value: 'bn', label: 'বাংলা' },
                  { value: 'en', label: 'English' },
                ]}
              />
              <Field id="search-price" name="maxPriceTaka" type="number" label={copy.maxPrice} min={0} max={100000} defaultValue={0} />
            </div>
            <Button type="submit">{copy.save}</Button>
          </form>
        </Card>

        <div className={styles.listHead}>
          <h2>{copy.list}</h2>
          {searches.length > 0 ? (
            <form action={checkSavedSearchesAction}>
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="secondary">
                {copy.check}
              </Button>
            </form>
          ) : null}
        </div>

        {searches.length === 0 ? (
          <EmptyState title={copy.empty} body={copy.lede} />
        ) : (
          <ul className={styles.list}>
            {searches.map((search) => (
              <li key={search.id}>
                <Card className={styles.item}>
                  <div>
                    <p className={styles.name}>{search.label}</p>
                    <p className={styles.meta}>
                      {[
                        search.query || null,
                        search.level || null,
                        search.language || null,
                        search.maxPricePaisa !== null ? formatPaisa(search.maxPricePaisa, language) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                    <p className={styles.meta}>
                      {copy.last}: {new Date(search.lastCheckedAt).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <Link
                      className={styles.open}
                      href={`/courses${search.query ? `?q=${encodeURIComponent(search.query)}` : ''}`}
                    >
                      {copy.open}
                    </Link>
                    <form action={deleteSavedSearchAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="searchId" value={search.id} />
                      <button type="submit" className={styles.remove}>
                        {copy.remove}
                      </button>
                    </form>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <p className={styles.back}>
          <Link href="/dashboard">{language === 'en' ? '← Back to dashboard' : '← ড্যাশবোর্ডে ফিরুন'}</Link>
        </p>
      </div>
    </div>
  );
}
