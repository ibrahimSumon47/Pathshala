import { listInstructorPromotions } from '@pathshala/db';
import { formatPaisa, type Locale } from '@pathshala/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import { createPromotionAction, togglePromotionAction } from './actions';
import styles from '../studio.module.css';

type PromotionsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; created?: string; saved?: string }>;
};

/** Teacher promo codes: each one belongs to a course the teacher owns. */
export default async function StudioPromotionsPage({ params, searchParams }: PromotionsPageProps) {
  const { locale } = await params;
  const { error, created, saved } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const user = await requireRole('instructor', 'admin');
  const view = await listInstructorPromotions(user.id, user.roles.includes('admin'));
  const copy =
    language === 'en'
      ? {
          back: '← Back to studio',
          eyebrow: 'Studio',
          title: 'Promo codes',
          lede: 'Make a code for one of your courses, cap it, and switch it off when the offer ends.',
          create: 'New code',
          code: 'Code',
          course: 'Course',
          type: 'Discount',
          value: 'Value',
          valueHint: 'Percent, or taka for a fixed amount',
          limit: 'Redemptions',
          days: 'Days valid (0 = no expiry)',
          submit: 'Create code',
          list: 'Your codes',
          empty: 'No codes yet.',
          usage: 'Used',
          status: 'Status',
          expires: 'Expires',
          toggle: 'Turn off',
          enable: 'Turn on',
          created: (code: string) => `${code} is ready at checkout.`,
          saved: 'Code updated.',
          emptyCourses: 'Create a course before making a code.',
        }
      : {
          back: '← স্টুডিওতে ফিরুন',
          eyebrow: 'স্টুডিও',
          title: 'প্রোমো কোড',
          lede: 'নিজের একটি কোর্সের জন্য কোড তৈরি করুন, ব্যবহারের সীমা দিন, আর অফার শেষ হলে বন্ধ করুন।',
          create: 'নতুন কোড',
          code: 'কোড',
          course: 'কোর্স',
          type: 'ছাড়',
          value: 'মান',
          valueHint: 'শতাংশ, বা নির্দিষ্ট টাকায় ছাড়',
          limit: 'কতবার ব্যবহার',
          days: 'কত দিন বৈধ (০ = মেয়াদ নেই)',
          submit: 'কোড তৈরি করুন',
          list: 'আপনার কোড',
          empty: 'এখনো কোনো কোড নেই।',
          usage: 'ব্যবহৃত',
          status: 'অবস্থা',
          expires: 'মেয়াদ',
          toggle: 'বন্ধ করুন',
          enable: 'চালু করুন',
          created: (code: string) => `${code} চেকআউটে ব্যবহার করা যাবে।`,
          saved: 'কোড হালনাগাদ হয়েছে।',
          emptyCourses: 'কোড বানানোর আগে একটি কোর্স তৈরি করুন।',
        };

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/studio" className={styles.back}>
          {copy.back}
        </Link>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {created ? <Alert tone="success">{copy.created(created)}</Alert> : null}
        {saved ? <Alert tone="success">{copy.saved}</Alert> : null}

        <section className={styles.panel} aria-labelledby="new-code">
          <h2 id="new-code" className={styles.sectionHeading}>
            {copy.create}
          </h2>
          {view.courses.length === 0 ? (
            <p className={styles.empty}>{copy.emptyCourses}</p>
          ) : (
            <form action={createPromotionAction} className={styles.form}>
              <input type="hidden" name="locale" value={locale} />
              <Select
                id="promo-course"
                name="courseId"
                label={copy.course}
                required
                options={view.courses.map((course) => ({
                  value: course.id,
                  label: course.title[language] ?? course.title.en ?? course.title.bn ?? '',
                }))}
              />
              <Field id="promo-code" name="code" label={copy.code} required minLength={3} maxLength={32} placeholder="SPRING-25" />
              <Select
                id="promo-type"
                name="type"
                label={copy.type}
                defaultValue="percent"
                options={[
                  { value: 'percent', label: language === 'en' ? 'Percent off' : 'শতাংশ ছাড়' },
                  { value: 'fixed', label: language === 'en' ? 'Fixed taka off' : 'নির্দিষ্ট টাকা ছাড়' },
                ]}
              />
              <Field
                id="promo-value"
                name="value"
                type="number"
                label={copy.value}
                hint={copy.valueHint}
                min={1}
                max={100000}
                required
              />
              <Field
                id="promo-limit"
                name="maxRedemptions"
                type="number"
                label={copy.limit}
                min={1}
                max={5000}
                defaultValue={50}
              />
              <Field id="promo-days" name="days" type="number" label={copy.days} min={0} max={365} defaultValue={30} />
              <Button type="submit">{copy.submit}</Button>
            </form>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="codes">
          <h2 id="codes" className={styles.sectionHeading}>
            {copy.list}
          </h2>
          {view.coupons.length === 0 ? <p className={styles.empty}>{copy.empty}</p> : null}
          {view.coupons.length > 0 ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{copy.code}</th>
                    <th scope="col">{copy.course}</th>
                    <th scope="col">{copy.type}</th>
                    <th scope="col">{copy.usage}</th>
                    <th scope="col">{copy.status}</th>
                    <th scope="col">{copy.expires}</th>
                    <th scope="col">{copy.toggle}</th>
                  </tr>
                </thead>
                <tbody>
                  {view.coupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td>
                        <strong>{coupon.code}</strong>
                      </td>
                      <td>{coupon.courseTitle[language] ?? coupon.courseTitle.en ?? coupon.courseTitle.bn ?? '—'}</td>
                      <td>
                        {coupon.type === 'percent'
                          ? `${coupon.value}%`
                          : formatPaisa(coupon.value, language)}
                      </td>
                      <td>
                        {coupon.redeemedCount}/{coupon.maxRedemptions}
                      </td>
                      <td>
                        <Badge tone={coupon.active ? 'success' : 'neutral'}>
                          {coupon.active ? (language === 'en' ? 'Active' : 'সক্রিয়') : language === 'en' ? 'Off' : 'বন্ধ'}
                        </Badge>
                      </td>
                      <td>{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString(locale) : '—'}</td>
                      <td>
                        <form action={togglePromotionAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="couponId" value={coupon.id} />
                          <input type="hidden" name="active" value={coupon.active ? 'false' : 'true'} />
                          <Button type="submit" variant="secondary" size="sm">
                            {coupon.active ? copy.toggle : copy.enable}
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
