import { listAdminCertificates } from '@pathshala/db';
import type { Locale } from '@pathshala/shared';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { buttonStyles } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { requireRole } from '@/lib/auth/guard';
import { setCertificateRevokedAction } from '../actions';
import styles from '../admin.module.css';

type CertificatesPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
};

const COPY = {
  bn: {
    back: '← অ্যাডমিন',
    title: 'সার্টিফিকেট',
    lede: 'প্রতিটি ইস্যু করা সার্টিফিকেট দেখুন। বাতিল করলে যাচাইয়ের পাতায় সেটি বাতিল হিসেবেই দেখা যাবে।',
    empty: 'এখনো কোনো সার্টিফিকেট ইস্যু হয়নি।',
    code: 'কোড',
    number: 'নম্বর',
    student: 'শিক্ষার্থী',
    course: 'কোর্স',
    instructor: 'প্রশিক্ষক',
    issued: 'ইস্যু',
    status: 'অবস্থা',
    actions: 'কার্যক্রম',
    active: 'বৈধ',
    revoked: 'বাতিল',
    revoke: 'বাতিল করুন',
    restore: 'ফিরিয়ে আনুন',
    saved: 'সার্টিফিকেটের অবস্থা সংরক্ষিত হয়েছে।',
  },
  en: {
    back: '← Admin',
    title: 'Certificates',
    lede: 'Every issued certificate, newest first. Revoking one changes the public verification page, not the record.',
    empty: 'No certificates have been issued yet.',
    code: 'Code',
    number: 'Number',
    student: 'Learner',
    course: 'Course',
    instructor: 'Instructor',
    issued: 'Issued',
    status: 'Status',
    actions: 'Actions',
    active: 'Valid',
    revoked: 'Revoked',
    revoke: 'Revoke',
    restore: 'Restore',
    saved: 'Certificate state saved.',
  },
} as const;

/** Operator desk for revoking a certificate without deleting its verification history. */
export default async function AdminCertificatesPage({ params, searchParams }: CertificatesPageProps) {
  const { locale } = await params;
  const { error, saved } = await searchParams;
  const language = (locale === 'en' ? 'en' : 'bn') as Locale;
  const copy = COPY[language];
  await requireRole('admin');
  const certificates = await listAdminCertificates();

  return (
    <div className={styles.page}>
      <div className="container">
        <Link href="/admin" className={styles.back}>
          {copy.back}
        </Link>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.lede}>{copy.lede}</p>
        {error ? <Alert tone="error">{error}</Alert> : null}
        {saved ? <Alert tone="success">{copy.saved}</Alert> : null}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">{copy.code}</th>
                <th scope="col">{copy.number}</th>
                <th scope="col">{copy.student}</th>
                <th scope="col">{copy.course}</th>
                <th scope="col">{copy.instructor}</th>
                <th scope="col">{copy.issued}</th>
                <th scope="col">{copy.status}</th>
                <th scope="col">{copy.actions}</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((certificate) => (
                <tr key={certificate.id}>
                  <td>
                    <Link href={`/verify/${certificate.code}`}>{certificate.code}</Link>
                  </td>
                  <td className={styles.email}>{certificate.number}</td>
                  <td>
                    {certificate.studentName}
                    <br />
                    <span className={styles.email}>{certificate.studentEmail}</span>
                  </td>
                  <td>{certificate.courseTitle[language] ?? certificate.courseTitle.en ?? certificate.courseTitle.bn ?? ''}</td>
                  <td>{certificate.instructorName}</td>
                  <td>{new Date(certificate.issuedAt).toLocaleDateString(locale)}</td>
                  <td>
                    <Badge tone={certificate.revokedAt ? 'warning' : 'success'}>
                      {certificate.revokedAt ? copy.revoked : copy.active}
                    </Badge>
                  </td>
                  <td>
                    <form action={setCertificateRevokedAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="certificateId" value={certificate.id} />
                      <input type="hidden" name="revoked" value={certificate.revokedAt ? 'false' : 'true'} />
                      <button type="submit" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
                        {certificate.revokedAt ? copy.restore : copy.revoke}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {certificates.length === 0 ? <p className={styles.empty}>{copy.empty}</p> : null}
        </div>
      </div>
    </div>
  );
}
