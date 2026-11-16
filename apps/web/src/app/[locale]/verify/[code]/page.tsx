import { getCertificateByCode } from '@pathshala/db';
import QRCode from 'qrcode';
import { notFound } from 'next/navigation';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import styles from './verify.module.css';

type VerifyPageProps = { params: Promise<{ locale: string; code: string }> };

/** Public certificate page and verification result; no sign-in is required. */
export default async function VerifyPage({ params }: VerifyPageProps) {
  const { locale, code } = await params;
  const certificate = await getCertificateByCode(code);
  if (!certificate) notFound();
  const language = locale === 'en' ? 'en' : 'bn';
  const copy = {
    bn: {
      eyebrow: 'সার্টিফিকেট যাচাই',
      title: 'সম্পন্নতার সার্টিফিকেট',
      awarded: 'প্রদান করা হয়েছে',
      course: 'কোর্স',
      instructor: 'প্রশিক্ষক',
      issued: 'প্রদানের তারিখ',
      number: 'সার্টিফিকেট নম্বর',
      verified: 'যাচাইকৃত',
      revoked: 'বাতিল করা হয়েছে',
      revokedBody: 'এই সার্টিফিকেটটি বাতিল করা হয়েছে। বিস্তারিত জানতে যোগাযোগ করুন।',
      note: 'কিউআর কোড স্ক্যান করলে এই যাচাই পৃষ্ঠাটি খুলবে।',
      browse: 'কোর্স দেখুন',
      invalid: 'এই কোডে কোনো সার্টিফিকেট নেই।',
    },
    en: {
      eyebrow: 'Certificate verification',
      title: 'Certificate of completion',
      awarded: 'Awarded to',
      course: 'Course',
      instructor: 'Instructor',
      issued: 'Issued',
      number: 'Certificate number',
      verified: 'Verified',
      revoked: 'Revoked',
      revokedBody: 'This certificate has been revoked. Contact the issuer for details.',
      note: 'Scanning the QR code opens this verification page.',
      browse: 'Browse courses',
      invalid: 'No certificate matches this code.',
    },
  } as const;
  const text = copy[language];
  const baseUrl = process.env.APP_URL ?? 'http://127.0.0.1:59800';
  const verifyUrl = `${baseUrl.replace(/\/$/, '')}/verify/${certificate.code}`;
  const qr = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 180, errorCorrectionLevel: 'M' });
  const issued = new Date(certificate.issuedAt).toLocaleDateString(locale, { dateStyle: 'long' });

  return (
    <div className={styles.page}>
      <div className="container">
        <p className={styles.eyebrow}>{text.eyebrow}</p>
        {certificate.revoked ? (
          <Alert tone="error">{text.revokedBody}</Alert>
        ) : (
          <Badge tone="success">{text.verified}</Badge>
        )}

        <Card className={styles.certificate}>
          <div className={styles.inner}>
            <p className={styles.brand}>পাঠশালা · Pathshala</p>
            <h1 className={styles.title}>{text.title}</h1>
            <p className={styles.awarded}>{text.awarded}</p>
            <p className={styles.name}>{certificate.studentName}</p>
            <p className={styles.course}>{certificate.courseTitle[language] || certificate.courseTitle.en || certificate.courseTitle.bn}</p>
            <div className={styles.meta}>
              <p>
                <span>{text.instructor}</span>
                {certificate.instructorName}
              </p>
              <p>
                <span>{text.issued}</span>
                {issued}
              </p>
              <p>
                <span>{text.number}</span>
                <strong>{certificate.number}</strong>
              </p>
            </div>
            <div className={styles.footer}>
              <div>
                <p className={styles.code}>{certificate.code}</p>
                <p className={styles.note}>{text.note}</p>
                <Link href={`/courses/${certificate.courseSlug}`}>{text.browse}</Link>
              </div>
              {/* QR encodes our own verification URL, never user input. */}
              <img src={qr} width={150} height={150} alt={`QR code for ${verifyUrl}`} className={styles.qr} />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
