import type { Metadata } from 'next';
import styles from '../legal.module.css';

type PolicyProps = { params: Promise<{ locale: string }> };

const COPY = {
  bn: {
    title: 'টাকা ফেরতের নীতি',
    updated: 'সর্বশেষ হালনাগাদ: ১৭ নভেম্বর ২০২৬',
    lede: 'কোর্স কিনে যদি মনে হয় এটি আপনার জন্য নয়, তাহলে শর্ত মিললে টাকা ফেরত নিতে পারবেন। নিচের নীতিটি সহজ ভাষায় লেখা।',
    sections: [
      {
        heading: 'কখন টাকা ফেরত পাবেন',
        body: [
          'কোর্স কেনার ১৪ দিনের মধ্যে আবেদন করলে, আর কোর্সের এক-চতুর্থাংশের কম পাঠ শেষ করে থাকলে, পুরো টাকা ফেরত দেওয়া হয়।',
          'কোর্সের এক-চতুর্থাংশ বা তার বেশি পাঠ শেষ করে ফেললে টাকা ফেরত দেওয়া হয় না। কারণ সেই মুহূর্তে আপনি কোর্সের বড় অংশ পেয়ে গেছেন।',
        ],
      },
      {
        heading: 'যেভাবে আবেদন করবেন',
        body: [
          'ড্যাশবোর্ডের “আমার অর্ডার” পাতায় গিয়ে যে অর্ডারটি ফেরত চান, সেটির পাশে লেখা সাহায্যের ঠিকানায় মেইল করুন। মেইলে অর্ডার নম্বর আর সংক্ষেপে কারণ লিখুন।',
          'আমরা দুই কর্মদিবসের মধ্যে উত্তর দিই। অনুমোদন হলে ৫ থেকে ১০ কর্মদিবসের মধ্যে একই পেমেন্ট মাধ্যমে টাকা ফেরত যায়।',
        ],
      },
      {
        heading: 'যা ফেরত হয় না',
        body: [
          'কোর্সের বাইরের কোনো লাইভ ক্লাসের আলাদা টিকিট, বা ডাউনলোড করা সংযুক্তি একবার কোর্স শেষ করার পর, ফেরতের আওতায় পড়ে না।',
          'এই সাইটের সব পেমেন্ট এখন পরীক্ষা মোডে চলে। পরীক্ষা মোডে আসল টাকা কাটা হয় না, তাই ফেরতও পরীক্ষামূলকভাবে রেকর্ড করা হয়।',
        ],
      },
    ],
    contact: 'প্রশ্ন থাকলে ড্যাশবোর্ডের সহায়তা ঠিকানায় লিখুন।',
  },
  en: {
    title: 'Refund policy',
    updated: 'Last updated: 17 November 2026',
    lede: 'If a course turns out not to be for you, you can ask for your money back when the conditions below are met. This page says it plainly.',
    sections: [
      {
        heading: 'When you can get a refund',
        body: [
          'Ask within 14 days of buying the course and, if you have completed less than a quarter of its lessons, you get the full amount back.',
          'Once you have completed a quarter or more of the lessons, the purchase is no longer refundable. By then you have used a real part of the course.',
        ],
      },
      {
        heading: 'How to ask',
        body: [
          'Open “My orders” on your dashboard and write to the support address shown beside the order. Include the order number and a sentence about what went wrong.',
          'We answer within two working days. Once approved, the money returns through the same payment method in 5 to 10 working days.',
        ],
      },
      {
        heading: 'What is not covered',
        body: [
          'A separate ticket for a live class outside the course, or downloaded attachments after you finish a course, are outside this policy.',
          'Every payment on this site currently runs in test mode. No real money is charged in test mode, so refunds are recorded in the sandbox rather than moved between banks.',
        ],
      },
    ],
    contact: 'Questions about a specific order belong in the support address on your dashboard.',
  },
} as const;

/** Static policy page; the copy avoids promising anything the checkout cannot do. */
export async function generateMetadata({ params }: PolicyProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = COPY[locale === 'en' ? 'en' : 'bn'];
  return { title: copy.title, description: copy.lede };
}

export default async function RefundPolicyPage({ params }: PolicyProps) {
  const { locale } = await params;
  const copy = COPY[locale === 'en' ? 'en' : 'bn'];

  return (
    <div className={styles.page}>
      <div className="container">
        <div className={styles.sheet}>
          <p className={styles.eyebrow}>{copy.updated}</p>
          <h1>{copy.title}</h1>
          <p className={styles.lede}>{copy.lede}</p>
          {copy.sections.map((section) => (
            <section key={section.heading} className={styles.section}>
              <h2>{section.heading}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>
          ))}
          <p className={styles.contact}>{copy.contact}</p>
        </div>
      </div>
    </div>
  );
}
