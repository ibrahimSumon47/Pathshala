/**
 * Seeded catalogue content.
 *
 * Every course here is demo data written for this project: no text is copied from another
 * site, and each course carries the depth a real course page needs — a short and a long
 * description, six outcomes, requirements, an audience, questions and a full outline.
 */

export type SeedLesson = {
  titleBn: string;
  titleEn: string;
  bodyBn: string;
  bodyEn: string;
  durationMinutes: number;
  isPreview?: boolean;
};

export type SeedSection = { titleBn: string; titleEn: string; lessons: SeedLesson[] };

export type SeedFaq = { questionBn: string; questionEn: string; answerBn: string; answerEn: string };

export type SeedCourse = {
  slug: string;
  category: string;
  instructor: string;
  titleBn: string;
  titleEn: string;
  subtitleBn: string;
  subtitleEn: string;
  shortBn: string;
  shortEn: string;
  descriptionBn: string;
  descriptionEn: string;
  pricePaisa: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  language: 'bn' | 'en';
  outcomesBn: string[];
  outcomesEn: string[];
  requirementsBn: string[];
  requirementsEn: string[];
  audienceBn: string[];
  audienceEn: string[];
  faqs: SeedFaq[];
  sections: SeedSection[];
};

export type SeedInstructor = {
  key: string;
  name: string;
  email: string;
  headline: string;
  headlineEn: string;
  bio: string;
  bioEn: string;
  image: string;
};

export const SEED_INSTRUCTORS: SeedInstructor[] = [
  {
    key: 'rafiq',
    name: 'Rafiqul Islam',
    email: 'instructor@pathshala.dev',
    headline: 'ওয়েব ডেভেলপার ও প্রশিক্ষক',
    headlineEn: 'Web developer and teacher',
    bio: 'ঢাকায় থাকেন, দশ বছর ধরে ওয়েব অ্যাপ্লিকেশন বানান। শিক্ষার্থীদের কাছে জটিল জিনিস ছোট করে দেখানোই তাঁর প্রিয় কাজ।',
    bioEn: 'Lives in Dhaka and has built web applications for ten years. He likes taking a complicated thing and showing it in small pieces.',
    image: '/avatars/rafiqul-islam.svg',
  },
];

export const SEED_COURSES: SeedCourse[] = [
  {
    slug: 'javascript-first-steps',
    category: 'programming',
    instructor: 'rafiq',
    titleBn: 'জাভাস্ক্রিপ্টের প্রথম ধাপ',
    titleEn: 'First Steps in JavaScript',
    subtitleBn: 'ব্রাউজারে চলে এমন ছোট প্রোগ্রাম তৈরি করুন',
    subtitleEn: 'Build small programs that run in the browser',
    shortBn: 'ভেরিয়েবল, শর্ত আর ফাংশন দিয়ে শুরু করুন; শেষে একটি খরচের হিসাব রাখার অ্যাপ বানাবেন।',
    shortEn: 'Start with variables, conditions and functions, then build an expense tracker of your own.',
    descriptionBn:
      'এই কোর্সে প্রোগ্রামিং শেখা শুরু হয় এমন একটা কাজ দিয়ে যা আপনার সত্যিই দরকার: খরচের হিসাব রাখা। প্রতিটি পাঠে একটি ছোট ধারণা, একটি উদাহরণ আর একটি কাজ। কোড লিখবেন ব্রাউজারের ভেতরেই, আলাদা কিছু ইনস্টল করতে হবে না।\n\nশেষ দিকে আপনি বুঝতে পারবেন কোন জায়গায় কী লিখতে হয়, ভুল হলে কোথায় দেখতে হয়, আর ছোট প্রোগ্রামকে কীভাবে পরিষ্কার রাখতে হয়। এটা কোনো চাকরির প্রস্তুতি নয়—এটা নিজের কাজ সহজ করার প্রস্তুতি।',
    descriptionEn:
      'This course starts with a job you actually have: keeping track of what you spend. Each lesson gives you one idea, one worked example and one task. You write code inside the browser, so there is nothing to install.\n\nBy the end you will know where each piece of a program lives, where to look when it breaks, and how to keep a small program readable. It is not interview preparation; it is preparation for making your own work easier.',
    pricePaisa: 0,
    level: 'beginner',
    language: 'bn',
    outcomesBn: [
      'ব্রাউজারে চলা ছোট প্রোগ্রাম লিখতে পারবেন',
      'ভেরিয়েবল আর ফাংশন দিয়ে কাজ ভাগ করতে পারবেন',
      'শর্ত আর লুপ দিয়ে সিদ্ধান্ত নিতে পারবেন',
      'ব্রাউজারের কনসোল দেখে ভুল ধরতে পারবেন',
      'ফর্মের ইনপুট পড়ে হিসাব করতে পারবেন',
      'শেষে একটি খরচের হিসাব রাখার অ্যাপ বানাতে পারবেন',
    ],
    outcomesEn: [
      'Write small programs that run in the browser',
      'Split work into variables and functions',
      'Make decisions with conditions and loops',
      'Read the browser console to find mistakes',
      'Take form input and do arithmetic with it',
      'Finish with a working expense tracker',
    ],
    requirementsBn: ['একটি কম্পিউটার আর আধুনিক ব্রাউজার', 'আগে প্রোগ্রামিং না জানলেও চলবে', 'দিনে আধা ঘণ্টা সময়'],
    requirementsEn: ['A computer with a modern browser', 'No earlier programming experience', 'About half an hour a day'],
    audienceBn: ['যারা প্রথমবার কোড লিখতে চান', 'অফিসের ছোট কাজ নিজে অটোমেট করতে চান', 'শিক্ষার্থী, যারা ভিত্তিটা পরিষ্কার করতে চান'],
    audienceEn: ['Anyone writing code for the first time', 'People who want to automate small office tasks', 'Students who want the foundation to be clear'],
    faqs: [
      {
        questionBn: 'কত দিনে শেষ হবে?',
        questionEn: 'How long does it take?',
        answerBn: 'দিনে ৩০ মিনিট করে দুই সপ্তাহ। তাড়াহুড়ো না করে প্রতিটি কাজ নিজে করার চেষ্টা করুন।',
        answerEn: 'Two weeks at half an hour a day. Take the tasks slowly and write each one yourself.',
      },
      {
        questionBn: 'কোনো সফটওয়্যার কিনতে হবে?',
        questionEn: 'Do I need to buy any software?',
        answerBn: 'না। ব্রাউজার আর একটি টেক্সট এডিটরই যথেষ্ট; ডেমো কোড ব্রাউজারেই চালানো যায়।',
        answerEn: 'No. A browser and any text editor are enough; the demo code runs in the browser.',
      },
      {
        questionBn: 'সার্টিফিকেট কি কাজে লাগবে?',
        questionEn: 'Is the certificate useful?',
        answerBn: 'সার্টিফিকেটে একটি যাচাই লিংক থাকে, তাই নিয়োগকর্তা নিজেই সত্যতা মিলিয়ে দেখতে পারেন। তবে আসল প্রমাণ আপনার বানানো অ্যাপ।',
        answerEn: 'It carries a verification link, so an employer can check it. The real proof, though, is the app you build.',
      },
    ],
    sections: [
      {
        titleBn: 'শুরু করার আগে',
        titleEn: 'Before you begin',
        lessons: [
          {
            titleBn: 'কোর্সটি কীভাবে করবেন',
            titleEn: 'How to work through this course',
            bodyBn:
              '<p>প্রতিটি পাঠে একটি ছোট কাজ আছে। কাজটি শেষ করে পরের পাঠে যান।</p><p>কোড লিখতে ভুল হবে—এটাই স্বাভাবিক। কনসোলের লাল লেখাটি পড়ুন, তারপর এক লাইন বদলে আবার চালান।</p>',
            bodyEn:
              '<p>Every lesson has one small task. Finish it before moving on.</p><p>Your code will break; that is normal. Read the red line in the console, change one line, run it again.</p>',
            durationMinutes: 8,
            isPreview: true,
          },
          {
            titleBn: 'প্রথম অনুশীলন',
            titleEn: 'Your first exercise',
            bodyBn: '<p>আজকের কাজটি খাতায় লিখুন, তারপর নিজের ভাষায় ব্যাখ্যা করুন।</p>',
            bodyEn: '<p>Write today’s task in a notebook, then explain it in your own words.</p>',
            durationMinutes: 12,
          },
        ],
      },
      {
        titleBn: 'খরচের হিসাব',
        titleEn: 'Tracking an expense',
        lessons: [
          {
            titleBn: 'সংখ্যা নিয়ে কাজ',
            titleEn: 'Working with numbers',
            bodyBn:
              '<p>টাকার হিসাবে দশমিক সংখ্যা ব্যবহার করা ঝামেলার। আমরা পয়সায় হিসাব রাখব, তারপর দেখানোর সময় টাকায় ভাগ করব।</p><pre><code>const price = 12000;\nconst quantity = 3;\nconsole.log(price * quantity);</code></pre>',
            bodyEn:
              '<p>Decimals make money arithmetic unreliable. Keep everything in paisa, then divide only when you display it.</p><pre><code>const price = 12000;\nconst quantity = 3;\nconsole.log(price * quantity);</code></pre>',
            durationMinutes: 15,
          },
          {
            titleBn: 'একটি তালিকা সাজানো',
            titleEn: 'Shaping a list',
            bodyBn:
              '<p>খরচের তালিকা একটি অ্যারে। প্রতিটি খরচ একটি অবজেক্ট: কী কিনেছেন, কত টাকা, কবে।</p><pre><code>const expenses = [{ name: "চাল", paisa: 65000 }];</code></pre>',
            bodyEn:
              '<p>An expense list is an array. Each row is an object: what you bought, the amount, the date.</p><pre><code>const expenses = [{ name: "Rice", paisa: 65000 }];</code></pre>',
            durationMinutes: 15,
          },
        ],
      },
    ],
  },
  {
    slug: 'spoken-english-daily',
    category: 'english',
    instructor: 'rafiq',
    titleBn: 'প্রতিদিনের ইংরেজি কথা',
    titleEn: 'Everyday Spoken English',
    subtitleBn: 'অফিস, বাজার আর আড্ডায় আত্মবিশ্বাসী হোন',
    subtitleEn: 'Speak with confidence at work, at the market and with friends',
    shortBn: 'প্রতিদিনের পরিস্থিতিতে দরকারি বাক্য, উচ্চারণ আর ছোট সংলাপ—মুখে বলার অভ্যাসই মূল কাজ।',
    shortEn: 'Useful sentences, pronunciation and short dialogues for the situations you meet every day.',
    descriptionBn:
      'অনেকে ব্যাকরণ জানেন, কিন্তু মুখ খুললে আটকে যান। এই কোর্সে আমরা ছোট ছোট সংলাপ বারবার বলব—বাজারে দাম জিজ্ঞাসা, অফিসে সময় চাওয়া, ফোনে পরিচয় দেওয়া।\n\nপ্রতিটি পাঠে একটি পরিস্থিতি, দুটি দরকারি বাক্য আর একটি রেকর্ডিং কাজ। নিজের কণ্ঠে বলুন, তারপর শুনে মিলিয়ে নিন।',
    descriptionEn:
      'Many people know the grammar and still freeze when they speak. This course repeats small dialogues until they come out on their own: asking a price at the market, asking for time at the office, introducing yourself on the phone.\n\nEvery lesson has one situation, two useful sentences and one recording task. Say it in your own voice, then listen back.',
    pricePaisa: 120000,
    level: 'beginner',
    language: 'bn',
    outcomesBn: [
      'প্রতিদিনের পাঁচটি পরিস্থিতিতে কথা বলতে পারবেন',
      'দাম, সময় আর দিক জিজ্ঞাসা করতে পারবেন',
      'ভদ্রভাবে অনুরোধ আর অসম্মতি জানাতে পারবেন',
      'ফোনে নিজের পরিচয় দিতে পারবেন',
      'নিজের কথা রেকর্ড করে শুনে ভুল ধরতে পারবেন',
      'দ্বিধা ছাড়া ছোট বাক্যে উত্তর দিতে পারবেন',
    ],
    outcomesEn: [
      'Speak in five everyday situations',
      'Ask about price, time and directions',
      'Make polite requests and refusals',
      'Introduce yourself on the phone',
      'Record yourself and hear your own mistakes',
      'Answer in short sentences without freezing',
    ],
    requirementsBn: ['সহজ ইংরেজি পড়তে পারা', 'জোরে বলার মতো শান্ত জায়গা', 'দিনে ১৫ মিনিট'],
    requirementsEn: ['Comfortable reading simple English', 'A quiet place to speak aloud', 'Fifteen minutes a day'],
    audienceBn: ['যারা লিখতে পারেন কিন্তু বলতে ভয় পান', 'অফিসে ইংরেজিতে কথা বলতে হয়', 'বিদেশে বা নতুন কাজে যোগ দিতে চলছেন'],
    audienceEn: ['People who write well but freeze when speaking', 'Anyone who needs English at work', 'Those preparing for a new job or a move abroad'],
    faqs: [
      {
        questionBn: 'উচ্চারণ ঠিক হচ্ছে কিনা বুঝব কীভাবে?',
        questionEn: 'How do I know my pronunciation is right?',
        answerBn: 'প্রতিটি পাঠে একটি নমুনা রেকর্ডিং আছে। নিজের রেকর্ডিং শুনে পাশাপাশি মিলিয়ে নিন; তাল আর স্বরই আসল।',
        answerEn: 'Each lesson includes a sample recording. Record yourself and compare; rhythm matters more than a perfect accent.',
      },
      {
        questionBn: 'ক্লাস কি লাইভ?',
        questionEn: 'Are the classes live?',
        answerBn: 'কোর্সটি নিজের গতিতে, তবে মাসে একবার লাইভ প্রশ্নোত্তর সেশন হয়। সেশনগুলো রেকর্ড হয় না।',
        answerEn: 'The course is self-paced, with a live question session once a month. Sessions are not recorded.',
      },
    ],
    sections: [
      {
        titleBn: 'প্রথম কথা',
        titleEn: 'Opening lines',
        lessons: [
          {
            titleBn: 'নমস্কার আর পরিচয়',
            titleEn: 'Greetings and introductions',
            bodyBn:
              '<p>“Hello, I’m Nusrat. I work at a small shop.”—দুই বাক্যেই পরিচয় শেষ। জোরে বলুন, তারপর নিজের নাম বসিয়ে আবার বলুন।</p>',
            bodyEn:
              '<p>“Hello, I’m Nusrat. I work at a small shop.” Two sentences are enough. Say them aloud, then say them again with your own name.</p>',
            durationMinutes: 10,
            isPreview: true,
          },
          {
            titleBn: 'দাম জিজ্ঞাসা',
            titleEn: 'Asking a price',
            bodyBn: '<p>“How much is this?” / “Could you tell me the price, please?” — বাজারে দ্বিতীয়টিই বেশি ভদ্র শোনায়।</p>',
            bodyEn: '<p>“How much is this?” / “Could you tell me the price, please?” — the second sounds softer at a market.</p>',
            durationMinutes: 12,
          },
        ],
      },
    ],
  },
  {
    slug: 'excel-for-office',
    category: 'office',
    instructor: 'rafiq',
    titleBn: 'অফিসের কাজে এক্সেল',
    titleEn: 'Excel for Office Work',
    subtitleBn: 'হিসাব, তালিকা আর রিপোর্ট গুছিয়ে ফেলুন',
    subtitleEn: 'Organise numbers, lists and reports without the mess',
    shortBn: 'সূত্র, ফিল্টার আর পিভট টেবিল দিয়ে বাস্তব অফিসের শীট সামলান, ছাপার রিপোর্ট পর্যন্ত।',
    shortEn: 'Formulas, filters and pivot tables on realistic office sheets, ending with a print-ready report.',
    descriptionBn:
      'অফিসের এক্সেল ফাইলে সাধারণত তিন ধরনের কাজ থাকে: তথ্য ঢোকানো, হিসাব করা আর রিপোর্ট বানানো। এই কোর্সে আমরা সেগুলোই করব, নকল উদাহরণ নয়—আসল মাসিক খাতা, বেতন ছক আর উপস্থিতির শীট।\n\nশেষে আপনি এমন একটি ফাইল বানাবেন যা সহকর্মী খুললেও বুঝতে পারবেন, আর ছাপলেও পরিষ্কার দেখাবে।',
    descriptionEn:
      'A working spreadsheet does three things: it takes in data, it calculates, and it reports. This course does all three on realistic sheets — a monthly ledger, a salary table, an attendance register.\n\nYou finish with a file a colleague can open and understand, and that prints cleanly.',
    pricePaisa: 150000,
    level: 'intermediate',
    language: 'bn',
    outcomesBn: [
      'সূত্র লিখে দৈনিক হিসাব করতে পারবেন',
      'তালিকা সাজিয়ে ভুল আর ডাবল এন্ট্রি ধরতে পারবেন',
      'পিভট টেবিল দিয়ে মাস ভিত্তিক সারসংক্ষেপ বানাতে পারবেন',
      'ডেটা ভ্যালিডেশন দিয়ে ভুল লেখা ঠেকাতে পারবেন',
      'শর্তসাপেক্ষ রং দিয়ে জরুরি সংখ্যা আলাদা করতে পারবেন',
      'এক পাতার ছাপার উপযোগী রিপোর্ট সাজাতে পারবেন',
    ],
    outcomesEn: [
      'Write formulas for daily totals',
      'Sort and clean a list to catch duplicates',
      'Summarise months with a pivot table',
      'Stop bad entries with data validation',
      'Highlight important numbers with conditional colour',
      'Lay out a one-page printable report',
    ],
    requirementsBn: ['এক্সেল ২০১৬ বা নতুন কোনো সংস্করণ', 'কীবোর্ডে টাইপ করার সাধারণ অভ্যাস'],
    requirementsEn: ['Excel 2016 or newer', 'Basic comfort typing'],
    audienceBn: ['অফিসে প্রতিদিন এক্সেল ব্যবহার করেন', 'রিপোর্ট বানানোর দায়িত্ব পেয়েছেন', 'হিসাবের ভুল কমাতে চান'],
    audienceEn: ['Anyone using Excel daily at work', 'People asked to produce reports', 'Anyone who wants fewer arithmetic mistakes'],
    faqs: [
      {
        questionBn: 'গুগল শিটসে চলবে?',
        questionEn: 'Does it work in Google Sheets?',
        answerBn: 'বেশিরভাগ সূত্র একই, তবে পিভট টেবিল আর ছাপার সেটিং এক্সেলে আলাদা। উদাহরণগুলো এক্সেলে দেখানো হয়েছে।',
        answerEn: 'Most formulas carry over, but pivot tables and print settings differ. The examples use Excel.',
      },
      {
        questionBn: 'কোন ফাইল লাগবে?',
        questionEn: 'Do I need to bring files?',
        answerBn: 'প্রতিটি সেকশনে ডাউনলোডযোগ্য অনুশীলনী শীট আছে। সেগুলো নামিয়ে নিজের কম্পিউটারে খুললেই হবে।',
        answerEn: 'Each section includes a downloadable practice sheet. Open it on your own computer.',
      },
    ],
    sections: [
      {
        titleBn: 'হিসাবের ভিত্তি',
        titleEn: 'The arithmetic base',
        lessons: [
          {
            titleBn: 'ঘর, নাম আর সূত্র',
            titleEn: 'Cells, names and formulas',
            bodyBn: '<p>=SUM(C2:C20) লিখলে যোগফল আসে। কিন্তু ঘরের নাম দিলে (=SUM(খরচ)) সূত্রটি পড়তে সহজ হয়।</p>',
            bodyEn: '<p>=SUM(C2:C20) adds the column. Naming the range (=SUM(expenses)) makes the formula easier to read.</p>',
            durationMinutes: 14,
            isPreview: true,
          },
          {
            titleBn: 'মাসিক খাতা তৈরি',
            titleEn: 'Building the monthly ledger',
            bodyBn: '<p>প্রথম তিন কলামে তারিখ, বিবরণ আর টাকা। চতুর্থ কলামে সূত্র, আর শেষে একটি মোট।</p>',
            bodyEn: '<p>Three columns hold date, description and amount. The fourth holds a formula, and the last row holds the total.</p>',
            durationMinutes: 18,
          },
        ],
      },
    ],
  },
  {
    slug: 'algebra-without-fear',
    category: 'mathematics',
    instructor: 'rafiq',
    titleBn: 'ভয় ছাড়া বীজগণিত',
    titleEn: 'Algebra Without Fear',
    subtitleBn: 'সমীকরণ বুঝুন, মুখস্থ নয়',
    subtitleEn: 'Understand equations instead of memorising steps',
    shortBn: 'ছবি আর ছোট ধাপে বীজগণিতের ধারণা; প্রতিটি অধ্যায়ে কাজ করা উদাহরণ আর অনুশীলনী।',
    shortEn: 'Algebraic ideas through pictures and short steps, with worked examples and practice in each chapter.',
    descriptionBn:
      'বীজগণিত ভয়ের বিষয় হয়ে ওঠে যখন নিয়মগুলো অর্থহীন মনে হয়। আমরা শুরু করব একটি দাঁড়িপাল্লা থেকে: দুই পাশে সমান ওজন থাকলে ভারসাম্য থাকে, এক পাশে যা করবেন অন্য পাশেও করতে হবে।\n\nএই একটি ধারণা থেকেই সমীকরণ, ভগ্নাংশ আর সরলীকরণ বোঝা যায়। প্রতিটি ধাপে কেন এমন করা হচ্ছে, সেটি লেখা থাকবে।',
    descriptionEn:
      'Algebra becomes frightening when the rules feel arbitrary. We start from a balance: if both sides weigh the same, it stays level, and whatever you do to one side you do to the other.\n\nThat single idea explains equations, fractions and simplification. Every step says why it is allowed.',
    pricePaisa: 90000,
    level: 'beginner',
    language: 'bn',
    outcomesBn: [
      'এক চলকের সরল সমীকরণ সমাধান করতে পারবেন',
      'ভগ্নাংশ নিয়ে নিশ্চিন্তে হিসাব করতে পারবেন',
      'প্রতিটি ধাপের কারণ ব্যাখ্যা করতে পারবেন',
      'শব্দ problem থেকে সমীকরণ বানাতে পারবেন',
      'নিজের উত্তর মিলিয়ে দেখতে পারবেন',
      'পরীক্ষায় সময় বাঁচিয়ে লিখতে পারবেন',
    ],
    outcomesEn: [
      'Solve simple equations in one variable',
      'Work with fractions without anxiety',
      'Explain the reason behind each step',
      'Turn a word problem into an equation',
      'Check your own answer',
      'Write faster in an exam',
    ],
    requirementsBn: ['পূর্ণ সংখ্যার যোগ-বিয়োগ-গুণ জানা', 'একটি খাতা আর পেন্সিল'],
    requirementsEn: ['Addition, subtraction and multiplication with whole numbers', 'A notebook and a pencil'],
    audienceBn: ['নবম-দশম শ্রেণির শিক্ষার্থী', 'যারা অনেক আগে পড়েছেন আর ভিত গোছাতে চান', 'অভিভাবক, যারা সন্তানকে সাহায্য করতে চান'],
    audienceEn: ['Students in classes nine and ten', 'Adults revisiting the basics', 'Parents helping a child with homework'],
    faqs: [
      {
        questionBn: 'প্রতিদিন কত সময় লাগবে?',
        questionEn: 'How much time each day?',
        answerBn: 'একটি পাঠ ২০ মিনিট, তারপর ১০ মিনিট নিজে লিখে অনুশীলন।',
        answerEn: 'Twenty minutes for the lesson, then ten minutes writing the practice yourself.',
      },
      {
        questionBn: 'উত্তর মিলিয়ে দেখব কীভাবে?',
        questionEn: 'How do I check my answers?',
        answerBn: 'প্রতিটি অনুশীলনীর শেষে উত্তর আছে, তবে আগে নিজে চেষ্টা করুন। ভুল হলে কোন ধাপে হলো সেটি খুঁজুন।',
        answerEn: 'Answers sit at the end of each exercise, but try first. When you miss, find the step where it went wrong.',
      },
    ],
    sections: [
      {
        titleBn: 'ভারসাম্যের ধারণা',
        titleEn: 'The idea of balance',
        lessons: [
          {
            titleBn: 'দুই পাশ সমান রাখা',
            titleEn: 'Keeping both sides equal',
            bodyBn: '<p>x + 3 = 10। দুই পাশ থেকে ৩ বাদ দিলে x = 7। যা করলেন, দুই পাশেই করলেন—এই নিয়মটুকুই আসল।</p>',
            bodyEn: '<p>x + 3 = 10. Subtract 3 from both sides and x = 7. Whatever you do, do it to both sides — that is the whole rule.</p>',
            durationMinutes: 12,
            isPreview: true,
          },
          {
            titleBn: 'ভগ্নাংশ সরানো',
            titleEn: 'Clearing a fraction',
            bodyBn: '<p>x/3 = 4। দুই পাশে ৩ দিয়ে গুণ করুন। ভগ্নাংশ সরানোর সবচেয়ে নিরাপদ উপায় এটিই।</p>',
            bodyEn: '<p>x/3 = 4. Multiply both sides by 3. That is the safest way to remove a fraction.</p>',
            durationMinutes: 14,
          },
        ],
      },
    ],
  },
  {
    slug: 'design-with-type',
    category: 'design',
    instructor: 'rafiq',
    titleBn: 'টাইপ দিয়ে ডিজাইন',
    titleEn: 'Design with Type',
    subtitleBn: 'সাদামাটা লেখাকে সুন্দর করে সাজান',
    subtitleEn: 'Make plain words look considered and clear',
    shortBn: 'অক্ষরের মাপ, ফাঁক, রং আর গ্রিড—কাগজে আর স্ক্রিনে, কোনো দামি সফটওয়্যার ছাড়াই।',
    shortEn: 'Type size, spacing, colour and grids on paper and screen, without expensive software.',
    descriptionBn:
      'বেশিরভাগ ডিজাইন আসলে লেখা সাজানোর কাজ। এই কোর্সে আমরা একটি পোস্টার, একটি ছোট ওয়েবপেজ আর একটি লিফলেট নিয়ে কাজ করব। প্রতিবার একই প্রশ্ন: পাঠক প্রথমে কী দেখবেন, তারপর কী?\n\nকোনো ডিজাইন সফটওয়্যার লাগবে না। কাগজ, পেন্সিল আর ব্রাউজারই যথেষ্ট।',
    descriptionEn:
      'Most design work is arranging words. This course works on a poster, a short web page and a leaflet. Each time the same question: what should the reader see first, and then what?\n\nNo design software is required. Paper, a pencil and a browser are enough.',
    pricePaisa: 180000,
    level: 'intermediate',
    language: 'en',
    outcomesBn: [
      'কোন মাপে লেখা পড়তে আরাম লাগে বুঝতে পারবেন',
      'তিন স্তরের একটি দৃশ্যমান ক্রম বানাতে পারবেন',
      'ফাঁক দিয়ে জিনিস আলাদা করতে পারবেন',
      'একটি রং বেছে সেটির সঙ্গে মিলিয়ে বাকি রং নিতে পারবেন',
      'এক পাতার পোস্টার সাজাতে পারবেন',
      'নিজের কাজ দেখে ভুল ধরতে পারবেন',
    ],
    outcomesEn: [
      'Choose readable type sizes with a reason',
      'Build a clear three-level hierarchy',
      'Use space to separate ideas',
      'Pick one colour and derive the rest',
      'Lay out a one-page poster',
      'Review your own work and spot what is wrong',
    ],
    requirementsBn: ['ব্রাউজার অথবা কাগজ-পেন্সিল', 'কোনো ডিজাইন সফটওয়্যার লাগবে না'],
    requirementsEn: ['A browser, or paper and pencil', 'No design software'],
    audienceBn: ['যারা নিজের কাজ নিজে সাজাতে চান', 'শিক্ষক, যিনি স্লাইড বানান', 'ছোট ব্যবসার মালিক'],
    audienceEn: ['People laying out their own work', 'Teachers who build slides', 'Small business owners'],
    faqs: [
      {
        questionBn: 'ফিগমা শিখব?',
        questionEn: 'Will I learn Figma?',
        answerBn: 'না। কোর্সটি নীতির উপর, কোনো একটি সফটওয়্যারের উপর নয়। শেখা নীতিগুলো যেকোনো টুলে কাজে লাগবে।',
        answerEn: 'No. The course teaches principles, not one tool. What you learn transfers to any editor.',
      },
      {
        questionBn: 'কাজ কি দেখা হবে?',
        questionEn: 'Will my work be reviewed?',
        answerBn: 'ফোরামে নিজের কাজ দিতে পারেন। শিক্ষক সপ্তাহে একবার উত্তর দেন।',
        answerEn: 'You can post work in the forum. The teacher answers once a week.',
      },
    ],
    sections: [
      {
        titleBn: 'মাপ আর ফাঁক',
        titleEn: 'Size and space',
        lessons: [
          {
            titleBn: 'পড়ার আরাম',
            titleEn: 'Reading comfort',
            bodyBn: '<p>লেখার মাপ ১৬ থেকে ১৮ পিক্সেলে রাখুন, লাইনের ফাঁক দেড় গুণ। ছোট লেখা সুন্দর দেখালেও পড়তে কষ্ট হয়।</p>',
            bodyEn: '<p>Keep body text between 16 and 18 pixels and line height around one and a half. Small text looks tidy and reads badly.</p>',
            durationMinutes: 14,
            isPreview: true,
          },
          {
            titleBn: 'তিন স্তরের ক্রম',
            titleEn: 'A three-level hierarchy',
            bodyBn: '<p>শিরোনাম, উপশিরোনাম আর লেখা—এই তিনটির মাপে স্পষ্ট পার্থক্য রাখুন।</p>',
            bodyEn: '<p>Title, subtitle and body: make the size difference between them obvious.</p>',
            durationMinutes: 16,
          },
        ],
      },
    ],
  },
  {
    slug: 'harmonium-first-raga',
    category: 'music',
    instructor: 'rafiq',
    titleBn: 'হারমোনিয়ামে প্রথম রাগ',
    titleEn: 'Your First Raga on Harmonium',
    subtitleBn: 'সুর, তাল আর প্রতিদিনের অভ্যাস',
    subtitleEn: 'Melody, rhythm and a practice you can keep',
    shortBn: 'হারমোনিয়াম ধরার নিয়ম থেকে একটি সহজ রাগ; শোনা, গুনে বলা আর বাজানোর পালা।',
    shortEn: 'From holding the harmonium to one simple raga, alternating listening, counting aloud and playing.',
    descriptionBn:
      'প্রথম দিনেই সুর বাজানো যায়, যদি হাতের চাপ আর বায়ুর প্রবাহ ঠিক থাকে। আমরা ধীরে শুরু করব: একটি স্বর, তারপর দুই স্বরের সম্পর্ক, তারপর ছোট একটি রাগ।\n\nপ্রতিটি পাঠে শোনার একটি অংশ আছে। শুনতে না পারলে বাজানো মুখস্থ হয়ে যায়—আর মুখস্থ সুর দ্রুত হারিয়ে যায়।',
    descriptionEn:
      'You can play a melody on the first day if the hand pressure and the airflow are right. We start slowly: one note, then the relation between two, then a short raga.\n\nEvery lesson includes listening. Without listening, playing becomes memorising, and memorised melody fades quickly.',
    pricePaisa: 100000,
    level: 'beginner',
    language: 'bn',
    outcomesBn: [
      'হারমোনিয়াম সঠিকভাবে ধরে রাখতে পারবেন',
      'বায়ুর চাপ নিয়ন্ত্রণ করে সুর পরিষ্কার করতে পারবেন',
      'সা-রে-গা মা-এর সম্পর্ক বুঝতে পারবেন',
      'একটি সহজ রাগ শুরু থেকে শেষ পর্যন্ত বাজাতে পারবেন',
      'তাল গুনে নিজের সঙ্গে মিলিয়ে বাজাতে পারবেন',
      'প্রতিদিনের জন্য একটি ছোট অভ্যাস তৈরি করতে পারবেন',
    ],
    outcomesEn: [
      'Hold the harmonium without tension',
      'Control the bellows for a clean note',
      'Understand how sa, re and ga relate',
      'Play one simple raga from start to finish',
      'Count a rhythm and play along with it',
      'Keep a short daily practice',
    ],
    requirementsBn: ['একটি হারমোনিয়াম (ভাড়া নিলেও চলবে)', 'দিনে ১৫ মিনিট', 'শোনার জন্য শান্ত জায়গা'],
    requirementsEn: ['Access to a harmonium, even a borrowed one', 'Fifteen minutes a day', 'A quiet place to listen'],
    audienceBn: ['যারা প্রথম যন্ত্র শিখছেন', 'যারা আগে শিখে ছেড়ে দিয়েছেন', 'সংগীত শিক্ষক, যিনি ভিত গোছাতে চান'],
    audienceEn: ['First-time instrument learners', 'People returning after a long break', 'Music teachers tightening their basics'],
    faqs: [
      {
        questionBn: 'হারমোনিয়াম না থাকলে?',
        questionEn: 'What if I do not own a harmonium?',
        answerBn: 'প্রথম দুই সপ্তাহ শুধু শুনে আর তাল গুনে চালাতে পারবেন। তারপর একটি ভাড়া বা ধার করা যন্ত্র দিয়েই কাজ চলে।',
        answerEn: 'The first two weeks work with listening and counting alone. After that, a borrowed or rented instrument is enough.',
      },
      {
        questionBn: 'কোন রাগ শেখানো হবে?',
        questionEn: 'Which raga is taught?',
        answerBn: 'ভৈরবের একটি সরল রূপ, কারণ এতে স্বর কম আর প্রতিটি স্বরের জায়গা স্পষ্ট।',
        answerEn: 'A simple form of Bhairav, because it uses few notes and each one sits clearly.',
      },
    ],
    sections: [
      {
        titleBn: 'যন্ত্র আর হাত',
        titleEn: 'The instrument and the hand',
        lessons: [
          {
            titleBn: 'বসা আর ধরা',
            titleEn: 'Sitting and holding',
            bodyBn: '<p>পিঠ সোজা, কাঁধ ঢিল, বাঁ হাত বায়ুতে আর ডান হাত কীবোর্ডে। প্রথমে বাতাস ছাড়ুন, তারপর স্বর চাপুন।</p>',
            bodyEn: '<p>Back straight, shoulders loose, left hand on the bellows and right on the keys. Release the air first, then press a note.</p>',
            durationMinutes: 12,
            isPreview: true,
          },
          {
            titleBn: 'প্রথম স্বর',
            titleEn: 'The first note',
            bodyBn: '<p>একটি স্বর ধরে রাখুন দশ সেকেন্ড। শব্দ কাঁপলে বাতাস সমান হচ্ছে না—ধীরে চাপ দিন।</p>',
            bodyEn: '<p>Hold one note for ten seconds. If the sound wavers, the airflow is uneven; press more slowly.</p>',
            durationMinutes: 14,
          },
        ],
      },
    ],
  },
];

/** Categories in navigation order, shared by the seed and the seeder's messages. */
export const SEED_CATEGORIES = [
  { slug: 'programming', bn: 'প্রোগ্রামিং', en: 'Programming', order: 1 },
  { slug: 'english', bn: 'ইংরেজি', en: 'English', order: 2 },
  { slug: 'office', bn: 'অফিস ও এক্সেল', en: 'Office and Excel', order: 3 },
  { slug: 'mathematics', bn: 'গণিত', en: 'Mathematics', order: 4 },
  { slug: 'design', bn: 'ডিজাইন', en: 'Design', order: 5 },
  { slug: 'music', bn: 'সংগীত', en: 'Music', order: 6 },
] as const;
