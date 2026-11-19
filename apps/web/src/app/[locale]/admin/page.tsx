import { getTranslations } from 'next-intl/server';
import type { UserRole } from '@pathshala/db';
import {
  getAdminReport,
  listAdminCourses,
  listAuditActions,
  listAuditEvents,
  listCategories,
  listModerationQueue,
} from '@pathshala/db';
import { formatPaisa } from '@pathshala/shared';
import { Alert } from '@/components/ui/alert';
import { Button, buttonStyles } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { Link } from '@/i18n/navigation';
import { listAccounts } from '@/lib/auth/accounts';
import { requireRole } from '@/lib/auth/guard';
import {
  createCategoryAction,
  setCourseStatusAction,
  setInstructorAccessAction,
  bulkModerationAction,
} from './actions';
import styles from './admin.module.css';

type AdminPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string; audit?: string }>;
};

/** Admin-only overview: accounts, subject taxonomy and the moderation entry points. */
export default async function AdminPage({ params, searchParams }: AdminPageProps) {
  const { locale } = await params;
  const { error, saved, audit } = await searchParams;
  const user = await requireRole('admin');
  const t = await getTranslations('Admin');
  const roles = await getTranslations('Roles');
  const auditAction = typeof audit === 'string' ? audit.trim().slice(0, 80) : '';
  const auditExportHref = auditAction
    ? `/api/admin/audit/export?action=${encodeURIComponent(auditAction)}`
    : '/api/admin/audit/export';
  const [accounts, categories, report, courses, auditRows, auditActions, moderation] = await Promise.all([
    listAccounts(),
    listCategories(),
    getAdminReport(),
    listAdminCourses(),
    listAuditEvents(20, { action: auditAction }),
    listAuditActions(),
    listModerationQueue(),
  ]);
  const roleLabel = (role: UserRole) => roles(role);
  const copy = locale === 'en'
    ? {
        report: 'Operating report',
        orders: 'Orders',
        coupons: 'Coupons',
        payouts: 'Payouts',
        users: 'Users',
        courses: 'Courses',
        published: 'Published',
        enrolments: 'Enrolments',
        certificates: 'Certificates',
        live: 'Live sessions',
        revenue: 'Test revenue',
        platform: 'Platform share',
        refunded: 'Refunded',
        moderation: 'Reviews and questions',
        reviews: 'Recent reviews',
        questions: 'Recent lesson questions',
        surveyComments: 'Completion survey comments',
        noSurveys: 'No survey comments yet.',
        hidden: 'Hidden',
        visible: 'Visible',
        hide: 'Hide',
        restore: 'Restore',
        select: 'Select',
        hideSelected: 'Hide selected',
        restoreSelected: 'Restore selected',
        selection: 'Bulk actions',
        noReviews: 'No reviews yet.',
        noQuestions: 'No questions yet.',
        approvals: 'Course approval',
        instructor: 'Instructor',
        status: 'Status',
        actions: 'Actions',
        publish: 'Publish',
        archive: 'Archive',
        draft: 'Unpublish',
        grant: 'Make instructor',
        revoke: 'Remove instructor',
        audit: 'Audit log',
        export: 'Export CSV',
        filterAction: 'Filter by action',
        allActions: 'All actions',
        applyFilter: 'Apply filter',
        clearFilter: 'Clear filter',
        filteredEmpty: 'No audit events for this action yet.',
        when: 'When',
        actor: 'Actor',
        action: 'Action',
        entity: 'Entity',
        saved: 'Saved.',
        emptyAudit: 'No audit events yet.',
      }
    : {
        report: 'পরিচালন প্রতিবেদন',
        orders: 'অর্ডার',
        coupons: 'কুপন',
        payouts: 'পরিশোধ',
        users: 'ব্যবহারকারী',
        courses: 'কোর্স',
        published: 'প্রকাশিত',
        enrolments: 'নথিভুক্তি',
        certificates: 'সার্টিফিকেট',
        live: 'লাইভ ক্লাস',
        revenue: 'পরীক্ষামূলক আয়',
        platform: 'প্ল্যাটফর্মের অংশ',
        refunded: 'রিফান্ড',
        moderation: 'মতামত ও প্রশ্ন',
        reviews: 'সাম্প্রতিক মতামত',
        questions: 'সাম্প্রতিক পাঠ-প্রশ্ন',
        surveyComments: 'কোর্স সমীক্ষার মন্তব্য',
        noSurveys: 'এখনো কোনো সমীক্ষার মন্তব্য নেই।',
        hidden: 'লুকানো',
        visible: 'দৃশ্যমান',
        hide: 'লুকান',
        restore: 'ফিরিয়ে আনুন',
        select: 'নির্বাচন',
        hideSelected: 'নির্বাচিতগুলো লুকান',
        restoreSelected: 'নির্বাচিতগুলো ফিরিয়ে আনুন',
        selection: 'একসাথে কার্যক্রম',
        noReviews: 'এখনো কোনো মতামত নেই।',
        noQuestions: 'এখনো কোনো প্রশ্ন নেই।',
        approvals: 'কোর্স অনুমোদন',
        instructor: 'প্রশিক্ষক',
        status: 'অবস্থা',
        actions: 'কার্যক্রম',
        publish: 'প্রকাশ করুন',
        archive: 'সংরক্ষণাগার',
        draft: 'অপ্রকাশিত করুন',
        grant: 'প্রশিক্ষক করুন',
        revoke: 'প্রশিক্ষকত্ব সরান',
        audit: 'অডিট লগ',
        export: 'সিএসভি ডাউনলোড',
        filterAction: 'কার্যক্রম দিয়ে ছাঁকুন',
        allActions: 'সব কার্যক্রম',
        applyFilter: 'ছাঁকনি লাগান',
        clearFilter: 'ছাঁকনি সরান',
        filteredEmpty: 'এই কার্যক্রমে এখনো কোনো অডিট ঘটনা নেই।',
        when: 'সময়',
        actor: 'ব্যবহারকারী',
        action: 'কার্যক্রম',
        entity: 'বিষয়',
        saved: 'সংরক্ষিত হয়েছে।',
        emptyAudit: 'এখনো কোনো অডিট ঘটনা নেই।',
      };

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>{t('title')}</h1>
        <p className={styles.lede}>{t('lede')}</p>
        <nav className={styles.subnav} aria-label={copy.report}>
          <Link href="/admin/orders">{copy.orders}</Link>
          <Link href="/admin/coupons">{copy.coupons}</Link>
          <Link href="/admin/payouts">{copy.payouts}</Link>
          <Link href="/admin/refunds">{locale === 'en' ? 'Refunds' : 'রিফান্ড'}</Link>
          <Link href="/admin/certificates">{locale === 'en' ? 'Certificates' : 'সার্টিফিকেট'}</Link>
        </nav>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">{copy.saved}</Alert> : null}

        <section className={styles.report} aria-label={copy.report}>
          {[
            [copy.users, report.users],
            [copy.courses, report.courses],
            [copy.published, report.publishedCourses],
            [copy.enrolments, report.enrolments],
            [copy.certificates, report.certificates],
            [copy.live, report.liveSessions],
            [copy.revenue, formatPaisa(report.revenuePaisa, locale === 'en' ? 'en' : 'bn')],
            [`${copy.platform} (${report.platformSharePercent}%)`, formatPaisa(report.platformPaisa, locale === 'en' ? 'en' : 'bn')],
            [copy.refunded, formatPaisa(report.refundedPaisa, locale === 'en' ? 'en' : 'bn')],
          ].map(([label, value]) => (
            <div key={String(label)} className={styles.stat}>
              <p className={styles.statLabel}>{label}</p>
              <p className={styles.statValue}>{value}</p>
            </div>
          ))}
        </section>

        <h2 className={styles.sectionTitle}>{copy.users}</h2>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{t('name')}</th>
                <th scope="col">{t('email')}</th>
                <th scope="col">{t('roles')}</th>
                <th scope="col">{copy.actions}</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id}>
                  <td>{account.name}</td>
                  <td className={styles.email}>{account.email}</td>
                  <td>{account.roles.map(roleLabel).join(', ')}</td>
                  <td>
                    {account.roles.includes('admin') || account.id === user.id ? null : (
                      <form action={setInstructorAccessAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="userId" value={account.id} />
                        <input type="hidden" name="grant" value={account.roles.includes('instructor') ? 'false' : 'true'} />
                        <button type="submit" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                          {account.roles.includes('instructor') ? copy.revoke : copy.grant}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length === 0 ? <p className={styles.empty}>{t('empty')}</p> : null}
        </div>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{copy.approvals}</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{copy.courses}</th>
                  <th scope="col">{copy.instructor}</th>
                  <th scope="col">{copy.status}</th>
                  <th scope="col">{copy.actions}</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.id}>
                    <td>
                      <Link href={`/courses/${course.slug}`}>{course.title[locale === 'en' ? 'en' : 'bn'] || course.title.en}</Link>
                      <span className={styles.email}> · {formatPaisa(course.pricePaisa, locale === 'en' ? 'en' : 'bn')}</span>
                    </td>
                    <td>{course.instructorName}</td>
                    <td>{course.status}</td>
                    <td className={styles.rowActions}>
                      {course.status !== 'published' ? (
                        <form action={setCourseStatusAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="status" value="published" />
                          <button type="submit" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>{copy.publish}</button>
                        </form>
                      ) : (
                        <form action={setCourseStatusAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="status" value="draft" />
                          <button type="submit" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>{copy.draft}</button>
                        </form>
                      )}
                      {course.status !== 'archived' ? (
                        <form action={setCourseStatusAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="courseId" value={course.id} />
                          <input type="hidden" name="status" value="archived" />
                          <button type="submit" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>{copy.archive}</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {courses.length === 0 ? <p className={styles.empty}>{locale === 'en' ? 'No courses yet.' : 'এখনো কোনো কোর্স নেই।'}</p> : null}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{copy.moderation}</h2>
          <form action={bulkModerationAction} className={styles.bulkForm}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="kind" value="review" />
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{copy.select}</th>
                    <th scope="col">{copy.reviews}</th>
                    <th scope="col">{copy.actor}</th>
                    <th scope="col">{copy.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {moderation.reviews.map((review) => (
                    <tr key={review.id}>
                      <td>
                        <input
                          type="checkbox"
                          name="ids"
                          value={review.id}
                          aria-label={`${copy.select} ${copy.reviews}: ${review.author}`}
                        />
                      </td>
                      <td>
                        {review.courseTitle[locale === 'en' ? 'en' : 'bn'] ?? review.courseTitle.en ?? ''}
                        <span className={styles.email}> · ★ {review.rating} · {review.body.slice(0, 90)}</span>
                      </td>
                      <td>{review.author}</td>
                      <td>{review.hidden ? copy.hidden : copy.visible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {moderation.reviews.length === 0 ? <p className={styles.empty}>{copy.noReviews}</p> : null}
            </div>
            <div className={styles.bulkBar} aria-label={copy.selection}>
              <button type="submit" name="hidden" value="true" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                {copy.hideSelected}
              </button>
              <button type="submit" name="hidden" value="false" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                {copy.restoreSelected}
              </button>
            </div>
          </form>

          <form action={bulkModerationAction} className={styles.bulkForm}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="kind" value="question" />
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{copy.select}</th>
                    <th scope="col">{copy.questions}</th>
                    <th scope="col">{copy.actor}</th>
                    <th scope="col">{copy.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {moderation.questions.map((question) => (
                    <tr key={question.id}>
                      <td>
                        <input
                          type="checkbox"
                          name="ids"
                          value={question.id}
                          aria-label={`${copy.select} ${copy.questions}: ${question.author}`}
                        />
                      </td>
                      <td>
                        {question.courseTitle[locale === 'en' ? 'en' : 'bn'] ?? question.courseTitle.en ?? ''}
                        <span className={styles.email}> · {question.lessonTitle[locale === 'en' ? 'en' : 'bn'] ?? ''} · {question.body.slice(0, 90)}</span>
                      </td>
                      <td>{question.author}</td>
                      <td>{question.hidden ? copy.hidden : copy.visible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {moderation.questions.length === 0 ? <p className={styles.empty}>{copy.noQuestions}</p> : null}
            </div>
            <div className={styles.bulkBar} aria-label={copy.selection}>
              <button type="submit" name="hidden" value="true" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                {copy.hideSelected}
              </button>
              <button type="submit" name="hidden" value="false" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                {copy.restoreSelected}
              </button>
            </div>
          </form>

          <form action={bulkModerationAction} className={styles.bulkForm}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="kind" value="survey" />
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">{copy.select}</th>
                    <th scope="col">{copy.surveyComments}</th>
                    <th scope="col">{copy.status}</th>
                  </tr>
                </thead>
                <tbody>
                  {moderation.surveys.map((survey) => (
                    <tr key={survey.id}>
                      <td>
                        <input
                          type="checkbox"
                          name="ids"
                          value={survey.id}
                          aria-label={`${copy.select} ${copy.surveyComments}: ${survey.comment.slice(0, 40)}`}
                        />
                      </td>
                      <td>
                        {survey.courseTitle[locale === 'en' ? 'en' : 'bn'] ?? survey.courseTitle.en ?? ''}
                        <span className={styles.email}> · {survey.comment}</span>
                      </td>
                      <td>{survey.hidden ? copy.hidden : copy.visible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {moderation.surveys.length === 0 ? <p className={styles.empty}>{copy.noSurveys}</p> : null}
            </div>
            <div className={styles.bulkBar} aria-label={copy.selection}>
              <button type="submit" name="hidden" value="true" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                {copy.hideSelected}
              </button>
              <button type="submit" name="hidden" value="false" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                {copy.restoreSelected}
              </button>
            </div>
          </form>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>{copy.audit}</h2>
            <a href={auditExportHref} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>{copy.export}</a>
          </div>
          <form method="get" className={styles.auditFilter}>
            <Select
              id="auditAction"
              name="audit"
              label={copy.filterAction}
              defaultValue={auditAction}
              options={[
                { value: '', label: copy.allActions },
                ...auditActions.map((action) => ({ value: action, label: action })),
              ]}
            />
            <div className={styles.filterActions}>
              <Button type="submit" variant="secondary" size="sm">
                {copy.applyFilter}
              </Button>
              {auditAction ? (
                <Link href="/admin" className={styles.filterClear}>
                  {copy.clearFilter}
                </Link>
              ) : null}
            </div>
          </form>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">{copy.when}</th>
                  <th scope="col">{copy.actor}</th>
                  <th scope="col">{copy.action}</th>
                  <th scope="col">{copy.entity}</th>
                </tr>
              </thead>
              <tbody>
                {auditRows.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.createdAt).toLocaleString(locale)}</td>
                    <td>{event.actorName}</td>
                    <td><code>{event.action}</code></td>
                    <td>{event.entityType}{event.entityId ? ` · ${event.entityId}` : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditRows.length === 0 ? (
              <p className={styles.empty}>{auditAction ? copy.filteredEmpty : copy.emptyAudit}</p>
            ) : null}
          </div>
        </section>

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
