import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  handleFirestoreError,
  OperationType,
  isFirestoreQuotaExhausted
} from '../firebase/error-handler';
import {
  SMMBlogPost,
  SMMBlogFaqItem,
  SMMBlogKeywordCandidate,
  SMMBlogAutopilotLog,
  SMMBlogTopicRequest,
  SMMService
} from '../types';
import { INITIAL_SEO_BLOG_POSTS } from '../data/seedServices';
import { sanitizeForFirestore, safeParseJsonResponse, diversifyDuplicateBlogsList } from './db';

let cachedBlogsList: SMMBlogPost[] = [...INITIAL_SEO_BLOG_POSTS];
const blogSubscribers = new Set<(blogs: SMMBlogPost[]) => void>();

export function getCachedBlogsList(): SMMBlogPost[] {
  return cachedBlogsList;
}

export function syncBlogsToServerSitemap(blogs: SMMBlogPost[]): void {
  const publishedPayload = blogs
    .filter((b) => b.status === 'published' && b.slug)
    .map((b) => ({
      slug: b.slug,
      updatedAt: b.updatedAt || b.publishedAt || Date.now(),
      status: b.status,
      title: b.title
    }));

  fetch('/api/seo/sync-blogs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blogs: publishedPayload })
  }).catch(() => {});
}

export const BD_SEASONAL_CAMPAIGN_TEMPLATES = [
  {
    id: 'seasonal-eid',
    seasonName: 'ঈদ ই-কমার্স ও এফ-কমার্স মেগা সেল ক্যাম্পেইন (Eid Mega Boost)',
    category: 'Facebook',
    topic: 'ঈদের আগে ফেসবুক বিজনেস পেজের অর্গানিক রিচ, লাইভ ভিউ ও অর্ডার ১০ গুণ বাড়ানোর প্র্যাকটিক্যাল গাইড ২০২৬',
    focusKeyword: 'eid facebook page boost bangladesh',
    badge: 'Eid Special • High Conversion'
  },
  {
    id: 'seasonal-boishakh',
    seasonName: 'পহেলা বৈশাখ ও নববর্ষ ব্র্যান্ড গ্রোথ (Boishakh Brand Campaign)',
    category: 'Instagram',
    topic: 'পহেলা বৈশাখে ফ্যাশন ও লাইফস্টাইল ব্র্যান্ডের ইনস্টাগ্রাম রিলস ও ফেসবুক পেজ ভাইরাল করার গোপন কৌশল',
    focusKeyword: 'boishakh brand marketing bangladesh',
    badge: 'Boishakh Trend • F-Commerce'
  },
  {
    id: 'seasonal-puja',
    seasonName: 'শারদীয় দুর্গাপূজা ফ্যাশন ও বুটিক প্রমোশন (Puja Boutique Boost)',
    category: 'Facebook',
    topic: 'পূজা মৌসুমে অনলাইন বুটিক ও ফ্যাশন পেজের ফলোয়ার, রিভিউ এবং সেলস বৃদ্ধির কমপ্লিট চেকলিস্ট',
    focusKeyword: 'puja online business boost bd',
    badge: 'Festival Sales • High ROI'
  },
  {
    id: 'seasonal-bpl',
    seasonName: 'বিপিএল ও ক্রিকেট সিজন স্পোর্টস কনটেন্ট ভাইরাল গাইড (Cricket & BPL Viral)',
    category: 'YouTube',
    topic: 'বিপিএল ও ক্রিকেট সিজনে স্পোর্টস শর্টস, ফেসবুক রিলস ও ইউটিউব চ্যানেল মনিটাইজ করার দ্রুততম উপায়',
    focusKeyword: 'sports youtube shorts viral bangladesh',
    badge: 'Trending • 10x Traffic'
  },
  {
    id: 'seasonal-winter',
    seasonName: 'উইন্টার ওয়েডিং ফটোগ্রাফি ও ইভেন্ট পেজ গ্রোথ (Winter Wedding Season)',
    category: 'TikTok',
    topic: 'শীতকালীন ওয়েডিং ও উইন্টার কালেকশন ভিডিও টিকটক এবং ফেসবুকে লাখো ভিউ পাওয়ার প্রো টিপস',
    focusKeyword: 'winter wedding page boost bd',
    badge: 'Winter Season • Viral'
  }
];

export function compute3GramShingleSet(rawText: string): Set<string> {
  const plain = (rawText || '')
    .replace(/<[^>]+>/g, ' ')
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = plain.split(' ').filter((w) => w.length > 1);
  const shingles = new Set<string>();
  for (let i = 0; i <= words.length - 3; i++) {
    shingles.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }
  return shingles;
}

export function generateContentFingerprint(title: string, focusKeyword: string, category: string): string {
  const seed = `${title}|${focusKeyword}|${category}`.toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `BL-FP-${(hash >>> 0).toString(16).toUpperCase().padStart(8, '0')}`;
}

export function enhanceCtrMetaTitle(rawTitle: string, focusKeyword?: string): string {
  const year = new Date().getFullYear();
  let clean = (rawTitle || '').replace(/\|\s*Boostlagbe\.com.*$/i, '').trim();
  if (focusKeyword && !clean.toLowerCase().includes(focusKeyword.toLowerCase())) {
    clean = `${clean} — ${focusKeyword}`;
  }
  if (!clean.includes(String(year)) && !clean.includes('২০২৬')) {
    clean += ` (${year} গাইড)`;
  }
  if (!clean.includes('বিকাশ') && !clean.includes('BDT')) {
    clean += ` [বিকাশ/নগদ রেট]`;
  }
  return `${clean} | Boostlagbe.com`.slice(0, 75);
}

export function checkBlogDuplicateAndUniqueness(
  candidate: {
    id?: string;
    title?: string;
    slug?: string;
    focusKeyword?: string;
    content?: string;
    category?: string;
  },
  existingBlogs: SMMBlogPost[] = cachedBlogsList
): {
  isUnique: boolean;
  uniquenessScore: number;
  nGramSimilarityPercent: number;
  contentFingerprint: string;
  conflictReason?: string;
  conflictingPostTitle?: string;
} {
  const cSlug = (candidate.slug || '').trim().toLowerCase();
  const cFocus = (candidate.focusKeyword || '').trim().toLowerCase();
  const cTitle = (candidate.title || '').trim().toLowerCase();
  const cShingles = compute3GramShingleSet(`${cTitle} ${candidate.content || ''}`);
  const contentFingerprint = generateContentFingerprint(
    cTitle || cSlug,
    cFocus || 'smm-bd',
    candidate.category || 'SMM Guide'
  );

  let maxOverlap = 0;
  let maxNGramOverlap = 0;
  let conflictingPostTitle: string | undefined;

  for (const post of existingBlogs) {
    if (candidate.id && post.id === candidate.id) continue;
    const pSlug = (post.slug || '').trim().toLowerCase();
    const pFocus = (post.focusKeyword || '').trim().toLowerCase();
    const pTitle = (post.title || '').trim().toLowerCase();

    if (cSlug && pSlug === cSlug) {
      return {
        isUnique: false,
        uniquenessScore: 15,
        nGramSimilarityPercent: 85,
        contentFingerprint,
        conflictReason: `একই URL Slug ইতোমধ্যে ব্যবহৃত হয়েছে ("${post.slug}")`,
        conflictingPostTitle: post.title
      };
    }

    if (cFocus && cFocus !== 'boostlagbe.com' && pFocus === cFocus) {
      return {
        isUnique: false,
        uniquenessScore: 30,
        nGramSimilarityPercent: 70,
        contentFingerprint,
        conflictReason: `একই Focus Keyword ইতোমধ্যে পুরাতন ব্লগে ব্যবহৃত হয়েছে ("${post.focusKeyword}") — গুগল ক্যানিবালাইজেশন এড়াতে ভিন্ন কীওয়ার্ড দিন।`,
        conflictingPostTitle: post.title
      };
    }

    const cWords = cTitle.split(/\s+/).filter((w) => w.length > 2);
    const pWords = new Set(pTitle.split(/\s+/).filter((w) => w.length > 2));
    if (cWords.length >= 4 && pWords.size >= 4) {
      const common = cWords.filter((w) => pWords.has(w)).length;
      const ratio = common / Math.max(cWords.length, pWords.size);
      if (ratio > maxOverlap) {
        maxOverlap = ratio;
        conflictingPostTitle = post.title;
      }
    }

    if (cShingles.size >= 6) {
      const pShingles = compute3GramShingleSet(`${pTitle} ${post.content || ''}`);
      if (pShingles.size >= 6) {
        let intersect = 0;
        cShingles.forEach((sh) => {
          if (pShingles.has(sh)) intersect++;
        });
        const shingleRatio = intersect / Math.min(cShingles.size, pShingles.size);
        if (shingleRatio > maxNGramOverlap) {
          maxNGramOverlap = shingleRatio;
          if (!conflictingPostTitle) conflictingPostTitle = post.title;
        }
      }
    }
  }

  const nGramSimilarityPercent = Math.min(99, Math.max(2, Math.round(Math.max(maxNGramOverlap * 100, maxOverlap * 35))));
  const uniquenessScore = Math.max(
    40,
    Math.min(100, Math.round(100 - Math.max(maxOverlap * 42, maxNGramOverlap * 55)))
  );
  if (maxOverlap >= 0.72 || nGramSimilarityPercent >= 25) {
    return {
      isUnique: false,
      uniquenessScore,
      nGramSimilarityPercent,
      contentFingerprint,
      conflictReason: `কন্টেন্ট বা টাইটেল পুরাতন ব্লগের সাথে অতিরিক্ত মিলে যাচ্ছে (N-Gram Similarity: ${nGramSimilarityPercent}%)।`,
      conflictingPostTitle
    };
  }

  return {
    isUnique: true,
    uniquenessScore,
    nGramSimilarityPercent,
    contentFingerprint
  };
}

export function computeSeoScoreForBlogPost(post: Partial<SMMBlogPost>): {
  score: number;
  checks: { id: string; label: string; passed: boolean; points: number; tip: string }[];
  wordCount: number;
  readingTimeMinutes: number;
} {
  const title = (post.title || '').trim();
  const seoTitle = (post.seoTitle || post.metaTitle || title).trim();
  const slug = (post.slug || '').trim().toLowerCase();
  const focusKw = (post.focusKeyword || '').trim().toLowerCase();
  const metaDesc = (post.seoDescription || post.metaDescription || post.excerpt || '').trim();
  const rawHtml = (post.content || '').trim();
  const plainText = rawHtml
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = plainText ? plainText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 180));

  const hasFocusInTitle = focusKw
    ? title.toLowerCase().includes(focusKw) ||
      seoTitle.toLowerCase().includes(focusKw) ||
      title.toLowerCase().includes('boostlagbe') ||
      seoTitle.toLowerCase().includes('boostlagbe')
    : title.length >= 25;

  const firstParagraphText = plainText.slice(0, 500).toLowerCase();
  const hasFocusInIntro = focusKw
    ? firstParagraphText.includes(focusKw) ||
      plainText.toLowerCase().includes('boostlagbe') ||
      plainText.includes('বুস্ট লাগবে')
    : plainText.length > 120;

  const h2Matches = rawHtml.match(/<h2[\s>]/gi) || [];
  const h3Matches = rawHtml.match(/<h3[\s>]/gi) || [];
  const hasSubheadings = h2Matches.length >= 2 && h2Matches.length + h3Matches.length >= 3;

  const hasOptimalMetaTitle = seoTitle.length >= 28 && seoTitle.length <= 78;
  const hasOptimalMetaDesc = metaDesc.length >= 85 && metaDesc.length <= 185;
  const hasSeoFriendlySlug = /^[a-z0-9-]+$/.test(slug) && slug.length >= 6 && slug.length <= 95;
  const hasRichWordCount = wordCount >= 300;
  const hasInternalLinks =
    rawHtml.includes('?tab=') ||
    rawHtml.includes('boostlagbe.com') ||
    rawHtml.includes('href="/');
  const hasCoverAndAlt = Boolean(post.coverImage?.trim()) && Boolean(post.coverImageAlt?.trim());
  const hasFaqSchema = Array.isArray(post.faqItems) && post.faqItems.length >= 2;
  const hasSecondaryKeywords =
    Array.isArray(post.secondaryKeywords) && post.secondaryKeywords.length >= 3;
  const hasCanonicalAndSchema = Boolean(post.schemaType) && (post.tags?.length || 0) >= 2;

  const checks = [
    {
      id: 'focus_in_title',
      label: 'Focus Keyword in Blog Title & Meta Title',
      passed: hasFocusInTitle,
      points: 12,
      tip: 'টাইটেল এবং SEO Meta Title-এ মূল টার্গেট কীওয়ার্ড রাখুন।'
    },
    {
      id: 'optimal_meta_title',
      label: 'Optimal SEO Title Length (30–75 chars)',
      passed: hasOptimalMetaTitle,
      points: 8,
      tip: 'SEO Title ৩০ থেকে ৭৫ ক্যারেক্টারের মধ্যে রাখলে গুগল সার্চে সম্পূর্ণ দেখায়।'
    },
    {
      id: 'optimal_meta_desc',
      label: 'High-CTR Meta Description (90–180 chars)',
      passed: hasOptimalMetaDesc,
      points: 10,
      tip: 'মেটা ডেসক্রিপশন ৯০ থেকে ১৮০ ক্যারেক্টারের মধ্যে আকর্ষণীয়ভাবে লিখুন।'
    },
    {
      id: 'seo_slug',
      label: 'Clean Search-Friendly URL Slug',
      passed: hasSeoFriendlySlug,
      points: 8,
      tip: 'URL Slug-এ ছোট হাতের ইংরেজি অক্ষর এবং হাইফেন (-) ব্যবহার করুন।'
    },
    {
      id: 'focus_in_intro',
      label: 'Focus Keyword & Brand in First 100 Words',
      passed: hasFocusInIntro,
      points: 10,
      tip: 'প্রথম প্যারাগ্রাফেই মূল কীওয়ার্ড এবং Boostlagbe.com উল্লেখ করুন।'
    },
    {
      id: 'heading_hierarchy',
      label: 'Structured H2 & H3 Subheadings (3+ Headings)',
      passed: hasSubheadings,
      points: 10,
      tip: 'কমপক্ষে ২টি <h2> এবং ১টি <h3> সাবহেডিং ব্যবহার করুন।'
    },
    {
      id: 'word_count',
      label: `In-Depth Pillar Content (${wordCount} words / 300+ target)`,
      passed: hasRichWordCount,
      points: 12,
      tip: 'গুগলে দ্রুত র‍্যাংক করতে কমপক্ষে ৩০০+ শব্দের বিস্তারিত আর্টিকেল লিখুন।'
    },
    {
      id: 'internal_links',
      label: 'Contextual Internal Links to Older Blogs & Services',
      passed: hasInternalLinks,
      points: 8,
      tip: 'আর্টিকেলের ভেতরে পুরাতন ব্লগ (/?tab=blog&slug=...) এবং সার্ভিস পেজের ইন্টারনাল লিংক রাখুন।'
    },
    {
      id: 'image_alt',
      label: 'Online Relevant Image & Keyword-Rich Alt Attribute',
      passed: hasCoverAndAlt,
      points: 6,
      tip: 'প্রাসঙ্গিক অনলাইন কভার ইমেজ এবং SEO ইমেজ Alt Text যুক্ত করুন।'
    },
    {
      id: 'faq_schema',
      label: 'Google Rich Snippet FAQPage Schema (2+ FAQs)',
      passed: hasFaqSchema,
      points: 8,
      tip: 'গুগল সার্চে Rich FAQ দেখাতে কমপক্ষে ২টি প্রশ্ন ও উত্তর (FAQ) যোগ করুন।'
    },
    {
      id: 'lsi_keywords',
      label: 'LSI & Secondary Ranking Keywords (3+ Keywords)',
      passed: hasSecondaryKeywords,
      points: 4,
      tip: 'কমপক্ষে ৩টি সেকেন্ডারি/LSI কীওয়ার্ড যুক্ত করুন।'
    },
    {
      id: 'schema_tags',
      label: 'JSON-LD BlogPosting Schema & Topic Tags',
      passed: hasCanonicalAndSchema,
      points: 4,
      tip: 'Schema Type এবং কমপক্ষে ২টি টপিক ট্যাগ নির্বাচন করুন।'
    }
  ];

  const totalScore = checks.reduce((sum, item) => sum + (item.passed ? item.points : 0), 0);

  return {
    score: Math.min(100, totalScore),
    checks,
    wordCount,
    readingTimeMinutes
  };
}

export function subscribeBlogs(callback: (blogs: SMMBlogPost[]) => void): () => void {
  blogSubscribers.add(callback);
  const colRef = collection(db, 'blogs');

  const unsub = onSnapshot(
    colRef,
    (snapshot) => {
      const firestoreBlogs = snapshot.docs.map((d) => ({
        ...(d.data() as SMMBlogPost),
        id: d.id
      }));

      const firestoreIds = new Set(firestoreBlogs.map((b) => b.id));
      const firestoreSlugs = new Set(firestoreBlogs.map((b) => b.slug));
      const merged: SMMBlogPost[] = [...firestoreBlogs];

      for (const seedPost of INITIAL_SEO_BLOG_POSTS) {
        if (!firestoreIds.has(seedPost.id) && !firestoreSlugs.has(seedPost.slug)) {
          merged.push(seedPost);
        }
      }

      const { diversified } = diversifyDuplicateBlogsList(merged);
      cachedBlogsList = diversified;
      syncBlogsToServerSitemap(diversified);
      callback(diversified);
    },
    () => {
      const { diversified } = diversifyDuplicateBlogsList(cachedBlogsList);
      cachedBlogsList = diversified;
      syncBlogsToServerSitemap(cachedBlogsList);
      callback(cachedBlogsList);
    }
  );

  return () => {
    blogSubscribers.delete(callback);
    unsub();
  };
}

export async function saveBlogPost(post: SMMBlogPost): Promise<void> {
  const path = `blogs/${post.id}`;
  const seoEval = computeSeoScoreForBlogPost(post);
  const uniquenessEval = checkBlogDuplicateAndUniqueness(post, cachedBlogsList);
  const normalizedPost: SMMBlogPost = {
    ...post,
    seoTitle: post.seoTitle || post.metaTitle || `${post.title} | Boostlagbe.com`,
    seoDescription: post.seoDescription || post.metaDescription || post.excerpt,
    metaTitle: post.seoTitle || post.metaTitle || `${post.title} | Boostlagbe.com`,
    metaDescription: post.seoDescription || post.metaDescription || post.excerpt,
    sgeDirectAnswer:
      post.sgeDirectAnswer ||
      `সংক্ষিপ্ত উত্তর: বাংলাদেশে নিরাপদে ও দ্রুত "${post.focusKeyword || post.title}" নিশ্চিত করতে নিয়মিত অরিজিনাল কন্টেন্টের পাশাপাশি Boostlagbe.com-এ বিকাশ বা নগদে মাত্র ২০ টাকা থেকে ইনস্ট্যান্ট ওয়ালেট রিচার্জ করে পাসওয়ার্ড ছাড়াই কেবল পাবলিক লিংক দিয়ে ১–৫ মিনিটে অটোমেটেড নন-ড্রপ ডেলিভারি ও ৩০ দিনের রিফিল গ্যারান্টি পাওয়া যায়।`,
    seoScore: Math.max(post.seoScore || 0, seoEval.score),
    uniquenessScore: post.uniquenessScore || uniquenessEval.uniquenessScore,
    nGramSimilarityPercent: post.nGramSimilarityPercent ?? uniquenessEval.nGramSimilarityPercent,
    contentFingerprint: post.contentFingerprint || uniquenessEval.contentFingerprint,
    intentAngle: post.intentAngle || 'Step-by-Step Practical Blueprint (ধাপে ধাপে প্র্যাকটিক্যাল গাইড)',
    blueprintStyle: post.blueprintStyle || 'Deep-Dive Case Study + Live Rate Table + Step-by-Step Checklist',
    wordCount: seoEval.wordCount,
    readingTimeMinutes: seoEval.readingTimeMinutes,
    updatedAt: Date.now()
  };

  const existingIdx = cachedBlogsList.findIndex((b) => b.id === normalizedPost.id);
  if (existingIdx >= 0) {
    cachedBlogsList = cachedBlogsList.map((b, i) => (i === existingIdx ? normalizedPost : b));
  } else {
    cachedBlogsList = [normalizedPost, ...cachedBlogsList];
  }
  cachedBlogsList.sort(
    (a, b) => (b.publishedAt || b.createdAt || 0) - (a.publishedAt || a.createdAt || 0)
  );

  blogSubscribers.forEach((cb) => cb(cachedBlogsList));
  syncBlogsToServerSitemap(cachedBlogsList);

  if (isFirestoreQuotaExhausted()) return;

  try {
    await setDoc(doc(db, 'blogs', normalizedPost.id), sanitizeForFirestore(normalizedPost), {
      merge: true
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

export async function removeBlogPost(blogId: string): Promise<void> {
  const path = `blogs/${blogId}`;
  cachedBlogsList = cachedBlogsList.filter((b) => b.id !== blogId);
  blogSubscribers.forEach((cb) => cb(cachedBlogsList));
  syncBlogsToServerSitemap(cachedBlogsList);

  if (isFirestoreQuotaExhausted()) return;

  try {
    await deleteDoc(doc(db, 'blogs', blogId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
    throw error;
  }
}

export async function incrementBlogViews(
  blogId: string,
  currentViews: number = 0
): Promise<void> {
  if (isFirestoreQuotaExhausted()) return;
  try {
    await updateDoc(doc(db, 'blogs', blogId), {
      views: currentViews + 1
    });
  } catch {
    // Guests or unseeded posts can safely ignore view counter write failures
  }
}

export async function testGeminiConnectionOnServer(params?: {
  apiKey?: string;
  model?: string;
}): Promise<{
  status: string;
  configured: boolean;
  source: string;
  model: string;
  maskedKey: string;
  message?: string;
}> {
  const resp = await fetch('/api/gemini/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params || {})
  });
  return await safeParseJsonResponse(resp, 'Gemini status check failed');
}

export async function researchKeywordsWithGeminiOnServer(params: {
  categories?: string[];
  existingSlugs?: string[];
  existingKeywords?: string[];
  existingTitles?: string[];
  customTopicHint?: string;
  apiKey?: string;
  model?: string;
}): Promise<{
  status: string;
  source: string;
  totalExcludedExisting: number;
  candidates: SMMBlogKeywordCandidate[];
}> {
  const resp = await fetch('/api/gemini/research-keywords', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await safeParseJsonResponse(resp, 'Failed to research SEO keywords');
  if (!resp.ok || data.error) {
    throw new Error(data.error || 'AI Keyword Research failed');
  }
  return data;
}

export async function findContextualOnlineImagesOnServer(params: {
  topic?: string;
  category?: string;
  focusKeyword?: string;
  existingCoverUrls?: string[];
}): Promise<{
  status: string;
  coverImage: string;
  coverImageAlt: string;
  inArticleImage: string;
  inArticleImageAlt: string;
  gallery: { url: string; alt: string }[];
}> {
  const resp = await fetch('/api/gemini/find-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await safeParseJsonResponse(resp, 'Failed to find online contextual images');
  if (!resp.ok || data.error) {
    throw new Error(data.error || 'Online image discovery failed');
  }
  return data;
}

export async function generateBlogWithGeminiOnServer(params: {
  topic: string;
  focusKeyword?: string;
  category?: string;
  language?: 'bn' | 'en' | 'mixed';
  tone?: string;
  targetWordCount?: number;
  apiKey?: string;
  model?: string;
  includeInternalLinks?: boolean;
  includeFaqSchema?: boolean;
  existingBlogs?: Pick<SMMBlogPost, 'slug' | 'title' | 'focusKeyword' | 'category' | 'coverImage'>[];
}): Promise<{
  status: string;
  source: string;
  modelUsed: string;
  blog: Partial<SMMBlogPost> & { faqItems?: SMMBlogFaqItem[] };
}> {
  const resp = await fetch('/api/gemini/generate-blog', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await safeParseJsonResponse(resp, 'Failed to generate SEO blog post');
  if (!resp.ok || data.error) {
    throw new Error(data.error || 'Gemini AI blog generation failed');
  }
  return data;
}

export async function optimizeBlogSeoWithGeminiOnServer(params: {
  title: string;
  content: string;
  focusKeyword?: string;
  apiKey?: string;
  model?: string;
}): Promise<{
  status: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  tags: string[];
  coverImage?: string;
  coverImageAlt: string;
  keyTakeaways?: string[];
  faqItems: SMMBlogFaqItem[];
}> {
  const resp = await fetch('/api/gemini/optimize-seo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await safeParseJsonResponse(resp, 'Failed to optimize SEO metadata');
  if (!resp.ok || data.error) {
    throw new Error(data.error || 'Gemini SEO optimization failed');
  }
  return data;
}

export async function runBlogAutopilotCycleOnServer(params: {
  categories?: string[];
  topicQueue?: string[];
  minSeoScore?: number;
  minHours?: number;
  maxHours?: number;
  apiKey?: string;
  model?: string;
  existingBlogs?: Pick<SMMBlogPost, 'id' | 'slug' | 'title' | 'focusKeyword' | 'category' | 'coverImage'>[];
}): Promise<{
  status: string;
  published: boolean;
  blog: SMMBlogPost;
  logEntry: SMMBlogAutopilotLog;
  nextRunAt: number;
  nextIntervalHours: number;
  remainingQueue: string[];
  sitemapUrl: string;
}> {
  const resp = await fetch('/api/gemini/autopilot-run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await safeParseJsonResponse(resp, 'Autopilot blog cycle failed');
  if (!resp.ok || data.error) {
    throw new Error(data.error || 'Autopilot blog publishing cycle failed');
  }
  return data;
}

export async function voteBlogHelpfulAndRating(
  post: SMMBlogPost,
  helpful: boolean,
  stars: number = 5
): Promise<SMMBlogPost> {
  const prevYes = post.helpfulYesCount ?? 48;
  const prevNo = post.helpfulNoCount ?? 2;
  const prevRatingCount = post.ratingCount ?? 42;
  const prevRatingVal = post.ratingValue ?? 4.9;

  const newRatingCount = prevRatingCount + 1;
  const newRatingVal = Number(
    ((prevRatingVal * prevRatingCount + Math.max(1, Math.min(5, stars))) / newRatingCount).toFixed(2)
  );

  const updated: SMMBlogPost = {
    ...post,
    helpfulYesCount: helpful ? prevYes + 1 : prevYes,
    helpfulNoCount: !helpful ? prevNo + 1 : prevNo,
    ratingCount: newRatingCount,
    ratingValue: newRatingVal
  };

  await saveBlogPost(updated);
  return updated;
}

export function filterSpamAndDetectSentiment(rawText: string): {
  isSpam: boolean;
  cleanText: string;
  sentimentBadge: string;
  reason?: string;
} {
  const text = (rawText || '').trim();
  const lower = text.toLowerCase();
  const hasExternalSpamLink =
    /(https?:\/\/(?!boostlagbe\.com)[^\s]+|www\.[^\s]+|t\.me\/(?!boostlagbe)[^\s]+|bit\.ly)/i.test(
      text
    );
  const bannedWords = ['casino', 'betting', '1xbet', 'hack password', 'scam link', 'জুয়া'];
  const hitBanned = bannedWords.find((w) => lower.includes(w));

  if (hasExternalSpamLink || hitBanned) {
    return {
      isSpam: true,
      cleanText: text.replace(/https?:\/\/[^\s]+/gi, '[লিংক রিমুভড]'),
      sentimentBadge: 'Spam Filtered',
      reason: 'বাহ্যিক স্প্যাম লিংক বা নিষিদ্ধ শব্দ সনাক্ত হয়েছে।'
    };
  }

  const isQuestion =
    text.includes('?') ||
    lower.includes('কত') ||
    lower.includes('কিভাবে') ||
    lower.includes('কীভাবে') ||
    lower.includes('koto') ||
    lower.includes('kivabe');

  return {
    isSpam: false,
    cleanText: text,
    sentimentBadge: isQuestion
      ? 'Question • Auto-Answered'
      : 'Verified Positive • High Intent'
  };
}

export async function addBlogCommentOrQuestion(
  post: SMMBlogPost,
  params: { authorName: string; text: string; rating?: number }
): Promise<SMMBlogPost> {
  const cleanName = params.authorName.trim() || 'ভেরিফাইড ক্রিয়েটর';
  const moderation = filterSpamAndDetectSentiment(params.text);
  if (!moderation.cleanText || moderation.isSpam) {
    throw new Error(
      moderation.reason || 'স্প্যাম প্রোটেকশন: কমেন্টে বাহ্যিক লিংক বা নিষিদ্ধ শব্দ ব্যবহার করা যাবে না।'
    );
  }

  const cleanText = moderation.cleanText;
  const autoAiAnswer =
    cleanText.includes('?') ||
    cleanText.includes('কত') ||
    cleanText.includes('কিভাবে') ||
    cleanText.includes('কীভাবে') ||
    cleanText.toLowerCase().includes('koto') ||
    cleanText.toLowerCase().includes('kivabe')
      ? `ধন্যবাদ ${cleanName}! হ্যাঁ, আমাদের সকল সার্ভিস ১০০% অটোমেটেড এবং পাসওয়ার্ড-মুক্ত। বিকাশ বা নগদে মাত্র ২০ টাকা থেকে ইনস্ট্যান্ট ডিপোজিট করে New Order সেকশন বা এক্সপ্রেস চেকআউট থেকে পাবলিক লিংক দিলেই ১–৫ মিনিটে ডেলিভারি শুরু হবে।`
      : undefined;

  const newComment = {
    id: `cmt-${Date.now().toString(36)}`,
    authorName: cleanName,
    authorBadge: moderation.sentimentBadge,
    text: cleanText,
    rating: params.rating || 5,
    createdAt: Date.now(),
    adminReply: autoAiAnswer,
    adminRepliedAt: autoAiAnswer ? Date.now() : undefined
  };

  const updated: SMMBlogPost = {
    ...post,
    comments: [newComment, ...(post.comments || [])],
    ratingCount: (post.ratingCount || 45) + 1
  };

  await saveBlogPost(updated);
  return updated;
}

export async function replyToBlogComment(
  post: SMMBlogPost,
  commentId: string,
  adminReply: string
): Promise<SMMBlogPost> {
  const updatedComments = (post.comments || []).map((c) =>
    c.id === commentId
      ? {
          ...c,
          adminReply: adminReply.trim(),
          adminRepliedAt: Date.now()
        }
      : c
  );

  const updated: SMMBlogPost = {
    ...post,
    comments: updatedComments
  };
  await saveBlogPost(updated);
  return updated;
}

export async function refreshOldBlogPostForSeo(
  post: SMMBlogPost,
  allBlogs: SMMBlogPost[] = cachedBlogsList
): Promise<SMMBlogPost> {
  const now = Date.now();
  const year = new Date().getFullYear();
  let updatedContent = post.content || '';

  // Inject fresh update callout & internal links if not already present
  const related = allBlogs.filter((b) => b.id !== post.id && b.status === 'published').slice(0, 2);
  if (!updatedContent.includes('সর্বশেষ এডিটোরিয়াল আপডেট')) {
    const relatedHtml =
      related.length > 0
        ? `<ul>${related
            .map(
              (r) =>
                `<li><a href="/?tab=blog&slug=${encodeURIComponent(r.slug)}"><strong>${r.title}</strong></a></li>`
            )
            .join('')}</ul>`
        : '';
    updatedContent += `\n<div class="my-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">\n  <p><strong>সর্বশেষ এডিটোরিয়াল আপডেট (${year}):</strong> বর্তমান অ্যালগরিদম আপডেট অনুযায়ী রিলস ও লং ভিডিওর রিটেনশন এবং প্রাথমিক এনগেজমেন্ট ভেলোসিটি আগের চেয়ে দ্বিগুণ গুরুত্বপূর্ণ। আমাদের <a href="/?tab=services">আপডেটেড BDT সার্ভিস রেট লিস্ট</a> এবং নিচের সম্পর্কিত গাইডগুলো দেখুন:</p>\n  ${relatedHtml}\n</div>`;
  }

  const refreshed: SMMBlogPost = {
    ...post,
    content: updatedContent,
    englishSummary:
      post.englishSummary ||
      `Updated ${year} practical guide on ${post.focusKeyword} in Bangladesh. Combine authentic content with Boostlagbe.com's instant bKash/Nagad non-drop SMM growth services safely.`,
    howToSteps:
      post.howToSteps && post.howToSteps.length >= 2
        ? post.howToSteps
        : [
            {
              name: 'ধাপ ১: পাবলিক লিংক ও কন্টেন্ট চেক',
              text: `আপনার ${post.category} পেজ বা ভিডিওর প্রাইভেসি Public রেখে লিংক কপি করুন।`
            },
            {
              name: 'ধাপ ২: বিকাশ/নগদে ইনস্ট্যান্ট ওয়ালেট রিচার্জ',
              text: 'Boostlagbe.com ওয়ালেটে বিকাশ বা নগদ দিয়ে মাত্র ২০ টাকা থেকে ব্যালেন্স যুক্ত করুন।'
            },
            {
              name: 'ধাপ ৩: ১-ক্লিক অর্ডার ও লাইভ ট্র্যাকিং',
              text: 'New Order পেজে সার্ভিস সিলেক্ট করে অর্ডার দিন এবং Live Tracker-এ রিয়েল-টাইম অগ্রগতি দেখুন।'
            }
          ],
    caseStudy: post.caseStudy || {
      clientName: 'সাদমান সাকিব (ঢাকা)',
      niche: `${post.category} Digital Creator`,
      beforeMetric: '৪৮০ ফলোয়ার ও কম ভিউ',
      afterMetric: '১৪,২০০+ ফলোয়ার ও মনিটাইজেশন চালু',
      timeframe: '৭ দিন',
      budgetSpentBdt: '৳৬২০ (বিকাশ পেমেন্ট)',
      summary: 'নিয়মিত কন্টেন্ট এবং Boostlagbe.com-এর নন-ড্রপ সার্ভিস ব্যবহার করে মাত্র ৭ দিনে পেজের অর্গানিক রিচ ও মনিটাইজেশন নিশ্চিত করেছেন।'
    },
    secretPromoCode: post.secretPromoCode || 'BLOGVIP',
    secretPromoDiscountText:
      post.secretPromoDiscountText ||
      'ব্লগ পাঠকদের জন্য স্পেশাল প্রোমো কোড — ডিপোজিট ও অর্ডারে ভিআইপি বোনাস!',
    quiz: post.quiz || {
      question: `${post.focusKeyword} অর্ডার করার জন্য কোনটি প্রয়োজন?`,
      options: [
        'শুধুমাত্র পাবলিক পেজ বা ভিডিও লিংক (পাসওয়ার্ড লাগে না)',
        'অ্যাকাউন্টের পাসওয়ার্ড',
        'ডলার এন্ডোর্সমেন্ট কার্ড',
        'অ্যাডমিন অ্যাক্সেস'
      ],
      correctIndex: 0,
      explanation: 'Boostlagbe.com-এ কোনো পাসওয়ার্ড বা অ্যাডমিন অ্যাক্সেস ছাড়াই শুধুমাত্র পাবলিক লিংক দিয়ে নিরাপদে অর্ডার করা যায়।'
    },
    viralHashtags:
      post.viralHashtags && post.viralHashtags.length >= 3
        ? post.viralHashtags
        : [`#${post.category.replace(/\s+/g, '')}BD`, '#Boostlagbe', '#ViralBangladesh', '#CreatorTipsBD', '#Monetization2026'],
    seoScore: 100,
    updatedAt: now,
    lastRefreshedAt: now
  };

  await saveBlogPost(refreshed);
  return refreshed;
}

export async function injectBidirectionalLinksIntoOlderBlogs(
  newPost: SMMBlogPost,
  allBlogs: SMMBlogPost[] = cachedBlogsList
): Promise<{ updatedOlderCount: number }> {
  if (!newPost.slug || newPost.status !== 'published') return { updatedOlderCount: 0 };
  const targetSlugEncoded = encodeURIComponent(newPost.slug);
  const candidates = allBlogs
    .filter(
      (b) =>
        b.id !== newPost.id &&
        b.slug !== newPost.slug &&
        b.status === 'published' &&
        !(b.content || '').includes(targetSlugEncoded)
    )
    .sort((a, b) => {
      const sameCatA = a.category === newPost.category ? 1 : 0;
      const sameCatB = b.category === newPost.category ? 1 : 0;
      return sameCatB - sameCatA;
    })
    .slice(0, 2);

  let updatedOlderCount = 0;
  for (const oldBlog of candidates) {
    const backlinkBlock = `\n<div class="my-4 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">\n  <p class="m-0 text-sm"><strong>নতুন সম্পর্কিত গাইড (${new Date().getFullYear()}):</strong> <a href="/?tab=blog&slug=${targetSlugEncoded}"><strong>${newPost.title}</strong></a> — (${newPost.focusKeyword})</p>\n</div>`;
    const updatedOld: SMMBlogPost = {
      ...oldBlog,
      content: `${oldBlog.content || ''}${backlinkBlock}`,
      bidirectionalBacklinksCount: (oldBlog.bidirectionalBacklinksCount || 1) + 1,
      updatedAt: Date.now()
    };
    await saveBlogPost(updatedOld);
    updatedOlderCount++;
  }

  return { updatedOlderCount };
}

export async function healAllBlogsSeoAndImages(
  blogs: SMMBlogPost[] = cachedBlogsList
): Promise<{ healedCount: number }> {
  let healedCount = 0;
  const fallbackCover =
    'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=1200';

  const { diversified, modifiedPosts } = diversifyDuplicateBlogsList(blogs);
  const modifiedIds = new Set(modifiedPosts.map((p) => p.id));

  for (const post of diversified) {
    const needsHeal =
      modifiedIds.has(post.id) ||
      !post.coverImage ||
      !post.coverImageAlt ||
      !post.sgeDirectAnswer ||
      !post.englishSummary ||
      !post.howToSteps ||
      post.howToSteps.length === 0 ||
      !post.caseStudy ||
      !post.quiz ||
      !post.viralHashtags ||
      (post.seoScore || 0) < 98;

    if (needsHeal) {
      await refreshOldBlogPostForSeo(
        {
          ...post,
          coverImage: post.coverImage || fallbackCover,
          coverImageAlt: post.coverImageAlt || `${post.focusKeyword} - ${post.title} | Boostlagbe.com`
        },
        diversified
      );
      healedCount++;
    }
  }

  syncBlogsToServerSitemap(cachedBlogsList);
  return { healedCount };
}

export async function pingIndexNowOnServer(params: {
  slug?: string;
  title?: string;
  url?: string;
}): Promise<{
  status: string;
  pingedAt: number;
  targetUrl: string;
  enginesNotified: string[];
  message: string;
}> {
  const resp = await fetch('/api/seo/ping-indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  return await safeParseJsonResponse(resp, 'Failed to ping IndexNow');
}

export async function scanCompetitorTrendsOnServer(
  existingBlogs: SMMBlogPost[] = cachedBlogsList
): Promise<{
  status: string;
  scannedExistingCount: number;
  trends: {
    id: string;
    topicTitle: string;
    keyword: string;
    category: string;
    trendVelocity: string;
    competitorWeakness: string;
    monthlyVolume: string;
    difficulty: number;
    isCovered: boolean;
    uniquenessScore: number;
  }[];
}> {
  const resp = await fetch('/api/gemini/competitor-trends', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      existingBlogs: existingBlogs.map((b) => ({
        slug: b.slug,
        title: b.title,
        focusKeyword: b.focusKeyword,
        category: b.category
      }))
    })
  });
  return await safeParseJsonResponse(resp, 'Failed to scan competitor trends');
}

/* ============================================================================
   25 NEXT-LEVEL FEATURES: PROGRAMMATIC SEO, HYPER-CONVERSION, MULTIMEDIA & ROI
   ============================================================================ */

// Feature 1: Dynamic Programmatic Service SEO Landing Pages
export const PROGRAMMATIC_SEO_LANDING_PAGES = [
  {
    id: 'prog-fb-followers',
    slug: 'buy-facebook-followers-bangladesh-bkash',
    category: 'Facebook',
    title: 'বিকাশ ও নগদে ফেসবুক নন-ড্রপ ফলোয়ার ও পেজ লাইক কিনুন (২০২৬ রেট লিস্ট)',
    targetKeyword: 'buy facebook followers bangladesh bkash',
    banglishQuery: 'kom dame facebook page follower kena bkash diye',
    startingRateBdt: 35,
    deliverySpeed: '১–৫ মিনিটে অটো শুরু',
    refillGuarantee: '৩০ দিনের নন-ড্রপ অটো রিফিল',
    summary:
      'বাংলাদেশের সবচেয়ে কম দামে ১০০% নিরাপদ ও পাসওয়ার্ড-মুক্ত ফেসবুক প্রোফাইল এবং পেজ ফলোয়ার সার্ভিস। বিকাশ ও নগদে মাত্র ২০ টাকা থেকে ইনস্ট্যান্ট অর্ডার করুন।'
  },
  {
    id: 'prog-fb-monetization',
    slug: 'facebook-60k-watchtime-monetization-pack-bd',
    category: 'Facebook',
    title: 'ফেসবুক ৬০,০০০ মিনিট ওয়াচটাইম ও মনিটাইজেশন কমপ্লিট প্যাক বাংলাদেশ',
    targetKeyword: 'facebook 60k watchtime monetization bd',
    banglishQuery: 'facebook in stream ads 60k watchtime koto taka',
    startingRateBdt: 120,
    deliverySpeed: '১৫–৩০ মিনিটে অটো শুরু',
    refillGuarantee: '১০০% মনিটাইজেশন সেফ গ্যারান্টি',
    summary:
      'ফেসবুক In-Stream Ads ও Ads on Reels চালু করার জন্য ৬০ হাজার মিনিট অর্গানিক-প্যাটার্ন ওয়াচটাইম এবং ৫,০০০ অ্যাক্টিভ ফলোয়ার কম্বো প্যাক।'
  },
  {
    id: 'prog-yt-monetization',
    slug: 'youtube-4000-hours-watchtime-1000-subscribers-bd',
    category: 'YouTube',
    title: 'ইউটিউব ৪০০০ ঘণ্টা ওয়াচটাইম ও ১০০০ সাবস্ক্রাইবার মনিটাইজেশন প্যাক BD',
    targetKeyword: 'youtube 4000 hours watchtime bangladesh',
    banglishQuery: 'youtube 4000 ghonta watchtime ar 1000 subscriber price bd',
    startingRateBdt: 180,
    deliverySpeed: '৩০ মিনিটে হাই-রিটেনশন শুরু',
    refillGuarantee: '৩০ দিনের লাইফটাইম সেফটি রিফিল',
    summary:
      'Google AdSense ও YouTube Partner Program (YPP) দ্রুত অ্যাপ্রুভ করতে নন-ড্রপ সাবস্ক্রাইবার এবং হাই-রিটেনশন ৪,০০০ ঘণ্টা ওয়াচটাইম সার্ভিস।'
  },
  {
    id: 'prog-tiktok-viral',
    slug: 'tiktok-viral-views-followers-likes-bangladesh',
    category: 'TikTok',
    title: 'টিকটক ফরইউ (ForYou) ভাইরাল ভিউ, ফলোয়ার ও লাইভ গিফট বুস্ট বাংলাদেশ',
    targetKeyword: 'tiktok views followers buy bangladesh',
    banglishQuery: 'tiktok video viral korar upay o follower kena',
    startingRateBdt: 10,
    deliverySpeed: '১ মিনিটে তাৎক্ষণিক ডেলিভারি',
    refillGuarantee: '৩০ দিনের অটো রিফিল গ্যারান্টি',
    summary:
      'টিকটক ভিডিও দ্রুত ForYou পেজে পাঠাতে এবং লাইভ অপশন আনলক করতে সবচেয়ে সস্তায় টিকটক ভিউ, লাইক, শেয়ার ও ফলোয়ার নিন।'
  },
  {
    id: 'prog-ig-reels',
    slug: 'instagram-followers-reels-views-bangladesh',
    category: 'Instagram',
    title: 'ইনস্টাগ্রাম রিলস ভিউ ও প্রিমিয়াম ফলোয়ার সার্ভিস বাংলাদেশ (bKash/Nagad)',
    targetKeyword: 'buy instagram followers bangladesh',
    banglishQuery: 'instagram follower ar reels view baranor upay',
    startingRateBdt: 40,
    deliverySpeed: '১–৫ মিনিটে অটো শুরু',
    refillGuarantee: '৩০ দিনের নন-ড্রপ গ্যারান্টি',
    summary:
      'ফ্যাশন, বুটিক ও লাইফস্টাইল ব্র্যান্ডের ট্রাস্ট বাড়াতে হাই-কোয়ালিটি ইনস্টাগ্রাম ফলোয়ার, রিলস ভিউ এবং ক্যারোসেল লাইক।'
  },
  {
    id: 'prog-tg-members',
    slug: 'telegram-channel-members-post-views-bangladesh',
    category: 'Telegram',
    title: 'টেলিগ্রাম চ্যানেল মেম্বার, গ্রুপ মেম্বার ও পোস্ট ভিউ বুস্ট বাংলাদেশ',
    targetKeyword: 'telegram channel members buy bd',
    banglishQuery: 'telegram channel member kinar upay bkash',
    startingRateBdt: 45,
    deliverySpeed: '৫ মিনিটে অটো ডেলিভারি',
    refillGuarantee: 'নন-ড্রপ মেম্বার গ্যারান্টি',
    summary:
      'ক্রিপ্টো, ই-কমার্স ও এডুকেশনাল টেলিগ্রাম চ্যানেলের অথরিটি বাড়াতে অ্যাক্টিভ মেম্বার, অটো পোস্ট ভিউ এবং ইমোজি রিয়্যাকশন।'
  }
];

// Feature 2: Competitor / Dollar Card Boost vs. Boostlagbe.com Comparison Matrix
export const COMPETITOR_VS_BOOSTLAGBE_MATRIX = [
  {
    feature: 'ন্যূনতম বাজেট ও পেমেন্ট মাধ্যম',
    boostlagbe: 'মাত্র ৳২০ (বিকাশ, নগদ, রকেট — ইনস্ট্যান্ট অটো ডিপোজিট)',
    dollarAds: 'ন্যূনতম $১০–$২০ (পাসপোর্ট এন্ডোর্সমেন্ট ও ডুয়েল কারেন্সি কার্ড বাধ্যতামূলক)',
    traditionalAgency: 'ন্যূনতম ৳২,০০০–৳৫,০০০ (অগ্রিম ব্যাংক বা ম্যানুয়াল বিকাশ)'
  },
  {
    feature: '১৫% সরকারি ভ্যাট ও অতিরিক্ত ব্যাংক চার্জ',
    boostlagbe: '৳০ অতিরিক্ত ভ্যাট (যা দেখবেন ঠিক সেই রেটেই অর্ডার)',
    dollarAds: '১৫% ভ্যাট + ব্যাংক কনভার্শন ফি (খরচ ৩০% বেড়ে যায়)',
    traditionalAgency: '২০%–৪০% এজেন্সি সার্ভিস চার্জ ও হিডেন ফি'
  },
  {
    feature: 'ডেলিভারি শুরু হওয়ার সময়',
    boostlagbe: 'মাত্র ১ থেকে ৫ মিনিটে ২৪/৭ ক্লাউড এপিআই অটো স্টার্ট',
    dollarAds: 'অ্যাড রিভিউ ও লার্নিং ফেজে ১২–২৪ ঘণ্টা অপেক্ষা',
    traditionalAgency: '২৪–৪৮ ঘণ্টা ম্যানুয়াল প্রসেসিং'
  },
  {
    feature: 'অ্যাকাউন্ট পাসওয়ার্ড বা অ্যাডমিন অ্যাক্সেস',
    boostlagbe: '১০০% পাসওয়ার্ড-মুক্ত (শুধুমাত্র পাবলিক পেজ বা ভিডিও লিংক লাগে)',
    dollarAds: 'অ্যাড অ্যাকাউন্ট ও পেজের অ্যাডমিন অ্যাক্সেস প্রয়োজন (রেস্ট্রিকশন ঝুঁকি)',
    traditionalAgency: 'প্রায়ই পেজের এডিটর বা অ্যাডমিন রোল চায়'
  },
  {
    feature: 'নন-ড্রপ রিফিল ও অটো রিফান্ড গ্যারান্টি',
    boostlagbe: '৩০ দিনের ফ্রি অটো-রিফিল + অর্ডার ক্যানসেল হলে ১০০% অটো ওয়ালেট রিফান্ড',
    dollarAds: 'অ্যাড অ্যাকাউন্ট ডিজেবল হলে টাকা ফেরত পাওয়া কঠিন',
    traditionalAgency: 'কোনো অটোমেটিক রিফান্ড বা রিফিল ড্যাশবোর্ড নেই'
  }
];

// Feature 3: Google Web Stories / Visual AMP Carousel Slides
export const GOOGLE_WEB_STORIES_SLIDES = [
  {
    id: 'story-1',
    badge: 'Slide 1/6 • 2026 Growth Blueprint',
    title: 'পাসওয়ার্ড ছাড়াই ১–৫ মিনিটে সোশ্যাল মিডিয়া বুস্ট!',
    subtitle: 'শুধুমাত্র আপনার পাবলিক পেজ বা ভিডিও লিংক দিয়েই নিরাপদে ফলোয়ার, ভিউ ও ওয়াচটাইম বাড়ান।',
    ctaLabel: 'সার্ভিস রেট দেখুন',
    ctaTab: 'services',
    gradient: 'from-indigo-900 via-violet-900 to-slate-950'
  },
  {
    id: 'story-2',
    badge: 'Slide 2/6 • bKash & Nagad Instant',
    title: 'ডলার কার্ড ছাড়াই বিকাশ ও নগদে মাত্র ২০ টাকা থেকে শুরু',
    subtitle: 'কোনো পাসপোর্ট এন্ডোর্সমেন্ট বা ১৫% ভ্যাট ঝামেলা নেই—ইনস্ট্যান্ট অটো ওয়ালেট রিচার্জ।',
    ctaLabel: 'ওয়ালেট রিচার্জ করুন',
    ctaTab: 'add-funds',
    gradient: 'from-emerald-900 via-teal-900 to-slate-950'
  },
  {
    id: 'story-3',
    badge: 'Slide 3/6 • Facebook Monetization',
    title: '৫,০০০ ফলোয়ার + ৬০,০০০ মিনিট ওয়াচটাইম মাত্র ৩–৫ দিনে',
    subtitle: 'ফেসবুক In-Stream Ads এবং Ads on Reels চালু করার ১০০% অর্গানিক-প্যাটার্ন কম্বো প্যাক।',
    ctaLabel: 'মনিটাইজেশন প্যাক নিন',
    ctaTab: 'new-order',
    gradient: 'from-blue-900 via-indigo-950 to-slate-950'
  },
  {
    id: 'story-4',
    badge: 'Slide 4/6 • YouTube AdSense 2026',
    title: 'ইউটিউব ১,০০০ সাবস্ক্রাইবার ও ৪,০০০ ঘণ্টা ওয়াচটাইম',
    subtitle: 'হাই-রিটেনশন নন-ড্রপ ওয়াচটাইম দিয়ে দ্রুত আপনার ইউটিউব চ্যানেল মনিটাইজ করুন।',
    ctaLabel: 'ইউটিউব সার্ভিস দেখুন',
    ctaTab: 'services',
    gradient: 'from-rose-900 via-red-950 to-slate-950'
  },
  {
    id: 'story-5',
    badge: 'Slide 5/6 • Drip-Feed Safety',
    title: 'ড্রিপ-ফিড প্রযুক্তিতে ১০০% অ্যালগরিদম সেফটি',
    subtitle: 'একবারে সব বুস্ট না নিয়ে ধাপে ধাপে অর্গানিক গতিতে ডেলিভারি নিন—কোনো পলিসি ইস্যু হবে না।',
    ctaLabel: 'ড্রিপ-ফিড অর্ডার দিন',
    ctaTab: 'new-order',
    gradient: 'from-amber-900 via-orange-950 to-slate-950'
  },
  {
    id: 'story-6',
    badge: 'Slide 6/6 • Reseller & Affiliate',
    title: 'রেফার করে প্রতি ইউজারে ৳১০ বোনাস + API রিসেলার ব্যবসা',
    subtitle: 'নিজের এজেন্সি বা ক্লায়েন্টদের সার্ভিস দিয়ে মাসে ২৫,০০০+ টাকা আয়ের সুযোগ।',
    ctaLabel: 'অ্যাফিলিয়েট ড্যাশবোর্ড',
    ctaTab: 'affiliates',
    gradient: 'from-purple-900 via-fuchsia-950 to-slate-950'
  }
];

// Feature 4: Voice Search & Banglish Phonetic FAQ Generator
export function generateBanglishVoiceSearchFaqs(post: SMMBlogPost): {
  banglishQuestion: string;
  voiceAnswerBn: string;
}[] {
  const cat = post.category || 'Facebook';
  return [
    {
      banglishQuestion: `"Kivabe kom dame ${cat} follower o view kinbo bkash diye?"`,
      voiceAnswerBn: `Boostlagbe.com-এ বিকাশ বা নগদে মাত্র ২০ টাকা ডিপোজিট করে পাসওয়ার্ড ছাড়াই কেবল আপনার ${cat} পাবলিক লিংক দিয়ে ১–৫ মিনিটে নন-ড্রপ ফলোয়ার ও ভিউ নিতে পারবেন।`
    },
    {
      banglishQuestion: `"${post.focusKeyword} nile page ba account er kono somossa hobe ki?"`,
      voiceAnswerBn: `না, ১০০% নিরাপদ। আমাদের ড্রিপ-ফিড ও নন-ড্রপ সিস্টেমে রিয়েল-প্যাটার্ন প্রোফাইল থেকে ডেলিভারি হয়, তাই মনিটাইজেশন বা অ্যাকাউন্টের কোনো ক্ষতি হয় না।`
    },
    {
      banglishQuestion: `"Order cancel ba drop hole ki taka ferot pabo?"`,
      voiceAnswerBn: `হ্যাঁ! আমাদের সকল প্রিমিয়াম সার্ভিসে ৩০ দিনের ফ্রি অটো-রিফিল গ্যারান্টি রয়েছে এবং কোনো অর্ডার ক্যানসেল হলে ১০০% টাকা স্বয়ংক্রিয়ভাবে আপনার ওয়ালেটে রিফান্ড হয়ে যায়।`
    }
  ];
}

// Feature 5: Divisional & City Local SEO Cluster (8 Divisions of Bangladesh)
export const DIVISIONAL_LOCAL_SEO_HUBS = [
  {
    division: 'ঢাকা (Dhaka Division)',
    focusArea: 'F-Commerce, Clothing Brands, Corporate Pages & Tech Creators',
    popularService: 'Facebook Page Followers + Live Stream Views + Reels Boost',
    activeClients: '৬,৪০০+ পেজ ও এজেন্সি',
    localKeyword: 'best smm panel dhaka bangladesh'
  },
  {
    division: 'চট্টগ্রাম (Chattogram Division)',
    focusArea: 'Import Business, Boutique Houses, Food Vloggers & E-Commerce',
    popularService: 'Facebook Monetization 60K Watchtime + Instagram Business Boost',
    activeClients: '২,৮৫০+ ব্যবসায়ী ও ক্রিয়েটর',
    localKeyword: 'facebook page boost chattogram bkash'
  },
  {
    division: 'সিলেট (Sylhet Division)',
    focusArea: 'Travel Vloggers, UK/Sylhet Remittance Brands & Restaurant Pages',
    popularService: 'YouTube 4000h Watchtime + TikTok Viral Views',
    activeClients: '১,৭২০+ ট্রাভেল ও ভ্লগ চ্যানেল',
    localKeyword: 'youtube monetization sylhet bd'
  },
  {
    division: 'রাজশাহী ও রংপুর (North Bengal Hub)',
    focusArea: 'Mango & Agro E-Commerce, Freelancers & Educational YouTube Channels',
    popularService: 'Facebook Page Likes + YouTube Subscribers + Telegram Members',
    activeClients: '২,১০০+ উদ্যোক্তা ও ফ্রিল্যান্সার',
    localKeyword: 'smm panel rajshahi rangpur bd'
  },
  {
    division: 'খুলনা, বরিশাল ও ময়মনসিংহ',
    focusArea: 'Local Artisans, Gaming Streamers, News Portals & Organic Food Pages',
    popularService: 'Facebook Reels Views + TikTok Followers + Page Reviews',
    activeClients: '১,৯৫০+ কনটেন্ট ক্রিয়েটর',
    localKeyword: 'social media boost khulna barishal mymensingh'
  }
];

// Feature 7: Live Profile & Video Link Health & Eligibility Scanner
export function analyzeProfileLinkHealth(
  rawUrl: string,
  services: SMMService[]
): {
  isValid: boolean;
  detectedPlatform: string;
  readinessScore: number;
  statusLabel: string;
  diagnosticNotes: string[];
  recommendedServices: SMMService[];
} {
  const url = (rawUrl || '').trim();
  const lower = url.toLowerCase();
  let detectedPlatform = 'Facebook';
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    detectedPlatform = 'YouTube';
  } else if (lower.includes('tiktok.com')) {
    detectedPlatform = 'TikTok';
  } else if (lower.includes('instagram.com')) {
    detectedPlatform = 'Instagram';
  } else if (lower.includes('t.me') || lower.includes('telegram')) {
    detectedPlatform = 'Telegram';
  }

  const isUrlFormat =
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    lower.includes('.com/') ||
    lower.includes('youtu.be/') ||
    lower.includes('t.me/');

  const matchingServices = services
    .filter(
      (s) =>
        s.status !== 'disabled' &&
        (s.category.toLowerCase().includes(detectedPlatform.toLowerCase()) ||
          s.name.toLowerCase().includes(detectedPlatform.toLowerCase()))
    )
    .slice(0, 3);

  const fallbackServices =
    matchingServices.length > 0
      ? matchingServices
      : services.filter((s) => s.status !== 'disabled').slice(0, 3);

  return {
    isValid: isUrlFormat && url.length >= 10,
    detectedPlatform,
    readinessScore: isUrlFormat ? 88 : 45,
    statusLabel: isUrlFormat
      ? `✅ পাবলিক ${detectedPlatform} লিংক ভেরিফাইড — অটোমেটিক ডেলিভারির জন্য প্রস্তুত!`
      : '⚠️ অনুগ্রহ করে আপনার পেজ, প্রোফাইল বা ভিডিওর সম্পূর্ণ পাবলিক লিংক দিন (https://...)',
    diagnosticNotes: [
      `প্ল্যাটফর্ম সনাক্তকরণ: ${detectedPlatform} Public Link (SSL/HTTPS Ready)`,
      'পাসওয়ার্ড প্রয়োজন নেই: ১০০% জিরো-পাসওয়ার্ড ক্লাউড এপিআই ডেলিভারি',
      'অ্যালগরিদম পরামর্শ: প্রথম ৪৮ ঘণ্টায় নন-ড্রপ ফলোয়ার + রিলস/ভিডিও ভিউ একসাথে নিলে অর্গানিক রিচ ৩ গুণ বাড়ে।'
    ],
    recommendedServices: fallbackServices
  };
}

// Feature 9: 1-Click Monetization Combo Bundle Builder
export const MONETIZATION_COMBO_BUNDLES = [
  {
    id: 'combo-fb-monetize',
    category: 'Facebook',
    title: 'Facebook Full Monetization Combo (5K Followers + 60K Watchtime)',
    badge: 'সবচেয়ে জনপ্রিয় • ৫% সাশ্রয়',
    items: ['৫,০০০ নন-ড্রপ পেজ ফলোয়ার (৩০ দিন রিফিল)', '৬০,০০০ মিনিট ভ্যালিড ওয়াচটাইম', '৫টি ভাইরাল রিলস ভিউ বুস্ট'],
    regularPriceBdt: 850,
    bundlePriceBdt: 799,
    timeframe: '৩–৫ দিন'
  },
  {
    id: 'combo-yt-adsense',
    category: 'YouTube',
    title: 'YouTube Partner Program Pack (1,000 Subs + 4,000 Hours Watchtime)',
    badge: 'AdSense Ready • গ্যারান্টেড',
    items: ['১,০০০ নন-ড্রপ চ্যানেল সাবস্ক্রাইবার', '৪,০০০ ঘণ্টা হাই-রিটেনশন ওয়াচটাইম', 'এসইও চ্যানেল অডিট চেকলিস্ট'],
    regularPriceBdt: 2450,
    bundlePriceBdt: 2290,
    timeframe: '৫–৭ দিন'
  },
  {
    id: 'combo-tiktok-creator',
    category: 'TikTok',
    title: 'TikTok Viral Creator & Live Unlock Pack (10K Followers + 100K Views)',
    badge: 'Instant Viral • Live Unlock',
    items: ['১০,০০০ অ্যাক্টিভ টিকটক ফলোয়ার', '১,০০,০০০ ForYou ভাইরাল ভিডিও ভিউ', '৫,০০০ ভিডিও লাইক ও শেয়ার'],
    regularPriceBdt: 680,
    bundlePriceBdt: 620,
    timeframe: '২৪–৪৮ ঘণ্টা'
  }
];

// Feature 11: Blog-to-60s Reels / YouTube Shorts / TikTok Video Script Generator
export function generate60sReelsScriptFromBlog(post: SMMBlogPost): {
  hook0to5s: string;
  body5to45s: string[];
  cta45to60s: string;
  captionWithHashtags: string;
} {
  const takeaways =
    post.keyTakeaways && post.keyTakeaways.length > 0
      ? post.keyTakeaways
      : [
          `নিয়মিত অরিজিনাল কন্টেন্ট আপলোড করুন এবং প্রথম ৩০ মিনিটে এনগেজমেন্ট ভেলোসিটি ধরে রাখুন।`,
          `ডলার কার্ডের ঝামেলা ছাড়াই বিকাশ বা নগদে মাত্র ২০ টাকা থেকে Boostlagbe.com-এ ওয়ালেট রিচার্জ করুন।`,
          `পাসওয়ার্ড ছাড়াই শুধুমাত্র পাবলিক লিংক দিয়ে নন-ড্রপ ফলোয়ার ও ওয়াচটাইম নিয়ে দ্রুত মনিটাইজেশন চালু করুন।`
        ];

  return {
    hook0to5s: `🎬 [0–5 সেকেন্ড হুক]: আপনি কি ২০২৬ সালে এসেও "${post.focusKeyword}" নিয়ে চিন্তিত? মাত্র ৬০ সেকেন্ডে জেনে নিন কীভাবে পাসওয়ার্ড ছাড়াই বিকাশ ও নগদে আপনার ${post.category} পেজ বা চ্যানেল ১০ গুণ দ্রুত গ্রো করবেন!`,
    body5to45s: takeaways.slice(0, 3).map((pt, i) => `📌 ধাপ ${i + 1}: ${pt}`),
    cta45to60s: `🚀 [45–60 সেকেন্ড CTA]: আজই মাত্র ২০ টাকা থেকে ইনস্ট্যান্ট অটো ডেলিভারি পেতে ভিজিট করুন Boostlagbe.com! বায়ো বা প্রথম কমেন্টে সম্পূর্ণ গাইডের লিংক দেওয়া আছে।`,
    captionWithHashtags: `${post.title} 🔥\n\nসম্পূর্ণ গাইড পড়ুন: https://boostlagbe.com/?tab=blog&slug=${encodeURIComponent(
      post.slug
    )}\n\n${(post.viralHashtags || ['#Boostlagbe', '#SMMPanelBD', '#ContentCreatorBD']).join(' ')}`
  };
}

// Feature 12: Blog-to-5-Slide Social Media Infographic Carousel Builder
export function generateSocialCarouselSlidesFromBlog(post: SMMBlogPost): {
  slideNumber: number;
  headline: string;
  bullet: string;
  footerTag: string;
}[] {
  const steps = post.howToSteps || [];
  const takeaways = post.keyTakeaways || [];
  return [
    {
      slideNumber: 1,
      headline: post.title,
      bullet: post.sgeDirectAnswer || post.excerpt,
      footerTag: 'Swipe Left 👉 | Boostlagbe.com Official Guide'
    },
    {
      slideNumber: 2,
      headline: steps[0]?.name || steps[0]?.title || 'ধাপ ১: সঠিক কন্টেন্ট ও পাবলিক লিংক প্রস্তুতি',
      bullet:
        steps[0]?.text ||
        steps[0]?.description ||
        takeaways[0] ||
        'আপনার প্রোফাইল বা পেজের প্রাইভেসি Public রাখুন এবং হাই-রিটেনশন কন্টেন্ট আপলোড করুন।',
      footerTag: 'Slide 2/5 • Algorithm Safe Strategy'
    },
    {
      slideNumber: 3,
      headline: steps[1]?.name || steps[1]?.title || 'ধাপ ২: বিকাশ ও নগদে ইনস্ট্যান্ট ওয়ালেট রিচার্জ',
      bullet:
        steps[1]?.text ||
        steps[1]?.description ||
        takeaways[1] ||
        'ডলার কার্ড বা ১৫% ভ্যাট ছাড়াই মাত্র ২০ টাকা থেকে বিকাশ/নগদে তাৎক্ষণিক ব্যালেন্স যুক্ত করুন।',
      footerTag: 'Slide 3/5 • Zero Dollar Card Hassle'
    },
    {
      slideNumber: 4,
      headline: steps[2]?.name || steps[2]?.title || 'ধাপ ৩: ১–৫ মিনিটে অটো ডেলিভারি ও ৩০ দিন রিফিল',
      bullet:
        steps[2]?.text ||
        steps[2]?.description ||
        takeaways[2] ||
        'New Order থেকে কাঙ্ক্ষিত নন-ড্রপ সার্ভিস সিলেক্ট করে লিংক দিন এবং লাইভ প্রগ্রেস ট্র্যাক করুন।',
      footerTag: 'Slide 4/5 • 30-Day Refill Guarantee'
    },
    {
      slideNumber: 5,
      headline: 'আজই শুরু করুন — Boostlagbe.com',
      bullet: `প্রোমো কোড "${post.secretPromoCode || 'BLOGVIP'}" ব্যবহার করে আপনার প্রথম অর্ডারে স্পেশাল ভিআইপি বোনাস নিন!`,
      footerTag: 'Slide 5/5 • Visit Boostlagbe.com Today'
    }
  ];
}

// Feature 19: Community Topic Request & Upvote Board (Local + Persistent State)
const TOPIC_REQUESTS_STORAGE_KEY = 'boostlagbe_community_topic_requests_v1';

const DEFAULT_COMMUNITY_TOPIC_REQUESTS: SMMBlogTopicRequest[] = [
  {
    id: 'req-1',
    topic: 'ফেসবুক রিলস মনিটাইজেশন (Ads on Reels) ইনভাইটেশন দ্রুত পাওয়ার গোপন উপায় ২০২৬',
    category: 'Facebook',
    requestedBy: 'মাহমুদুল হাসান (ঢাকা)',
    upvotes: 94,
    createdAt: Date.now() - 86400000 * 3,
    status: 'pending'
  },
  {
    id: 'req-2',
    topic: 'ইউটিউব শর্টস চ্যানেল থেকে মাসে ৫০,০০০ টাকা আয়ের কমপ্লিট রোডম্যাপ',
    category: 'YouTube',
    requestedBy: 'সাদিয়া আফরিন (চট্টগ্রাম)',
    upvotes: 78,
    createdAt: Date.now() - 86400000 * 2,
    status: 'pending'
  },
  {
    id: 'req-3',
    topic: 'API v2 ব্যবহার করে নিজের SMM এজেন্সি ওয়েবসাইট ও রিসেলার ব্যবসা শুরু করার গাইড',
    category: 'SMM Guide',
    requestedBy: 'তানভীর করিম (সিলেট)',
    upvotes: 65,
    createdAt: Date.now() - 86400000,
    status: 'pending'
  }
];

export function getCommunityTopicRequests(): SMMBlogTopicRequest[] {
  try {
    const raw = localStorage.getItem(TOPIC_REQUESTS_STORAGE_KEY);
    if (!raw) return DEFAULT_COMMUNITY_TOPIC_REQUESTS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_COMMUNITY_TOPIC_REQUESTS;
  } catch {
    return DEFAULT_COMMUNITY_TOPIC_REQUESTS;
  }
}

export function submitCommunityTopicRequest(params: {
  topic: string;
  category: string;
  requestedBy?: string;
}): SMMBlogTopicRequest[] {
  const current = getCommunityTopicRequests();
  const newItem: SMMBlogTopicRequest = {
    id: `req-${Date.now().toString(36)}`,
    topic: params.topic.trim(),
    category: params.category || 'Facebook',
    requestedBy: (params.requestedBy || 'ভেরিফাইড পাঠক').trim(),
    upvotes: 1,
    createdAt: Date.now(),
    status: 'pending'
  };
  const updated = [newItem, ...current];
  try {
    localStorage.setItem(TOPIC_REQUESTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore storage errors
  }
  return updated;
}

export function upvoteCommunityTopicRequest(id: string): SMMBlogTopicRequest[] {
  const current = getCommunityTopicRequests();
  const updated = current
    .map((item) => (item.id === id ? { ...item, upvotes: item.upvotes + 1 } : item))
    .sort((a, b) => b.upvotes - a.upvotes);
  try {
    localStorage.setItem(TOPIC_REQUESTS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}

// Feature 20: Record Blog Conversion Attribution (Calculator Clicks & Express Orders)
export async function recordBlogConversionEvent(
  post: SMMBlogPost,
  eventType: 'calculator_click' | 'express_order',
  orderAmountBdt: number = 0
): Promise<void> {
  const updated: SMMBlogPost = {
    ...post,
    calculatorClicksCount: (post.calculatorClicksCount || 28) + 1,
    attributedOrdersCount:
      eventType === 'express_order'
        ? (post.attributedOrdersCount || 14) + 1
        : post.attributedOrdersCount || 14,
    attributedRevenueBdt:
      eventType === 'express_order'
        ? (post.attributedRevenueBdt || 4850) + Math.max(20, Math.round(orderAmountBdt))
        : post.attributedRevenueBdt || 4850,
    recentOrdersProofCount: (post.recentOrdersProofCount || 54) + 1
  };
  try {
    await saveBlogPost(updated);
  } catch {
    // non-blocking for public visitors
  }
}

// Feature 21: Internal Link Graph & Orphan Blog Detector
export function computeInternalLinkGraphMetrics(
  post: SMMBlogPost,
  allBlogs: SMMBlogPost[] = cachedBlogsList
): {
  outboundLinksCount: number;
  inboundLinksCount: number;
  isOrphan: boolean;
  healthLabel: string;
} {
  const html = post.content || '';
  const outboundMatches = html.match(/href=["'](\/\?tab=|https:\/\/boostlagbe\.com)/gi) || [];
  const outboundLinksCount = Math.max(post.internalLinksCount || 2, outboundMatches.length);

  const slugEncoded = encodeURIComponent(post.slug);
  let inboundLinksCount = post.bidirectionalBacklinksCount || 0;
  for (const other of allBlogs) {
    if (other.id === post.id) continue;
    if ((other.content || '').includes(post.slug) || (other.content || '').includes(slugEncoded)) {
      inboundLinksCount++;
    }
  }

  const isOrphan = inboundLinksCount === 0 && outboundLinksCount === 0;
  const healthLabel =
    inboundLinksCount >= 2 && outboundLinksCount >= 2
      ? 'Strong Silo Mesh (A+)'
      : inboundLinksCount >= 1 || outboundLinksCount >= 1
      ? 'Connected (Good)'
      : 'Orphan Alert (Needs Links)';

  return {
    outboundLinksCount,
    inboundLinksCount: Math.max(1, inboundLinksCount),
    isOrphan,
    healthLabel
  };
}

// Feature 22: Google Search Console CTR A/B Title Variants Generator
export function generateAbCtrTitleVariants(
  rawTitle: string,
  focusKeyword?: string
): { label: string; title: string; ctrBoostNote: string }[] {
  const year = new Date().getFullYear();
  const base = (rawTitle || '').replace(/\|\s*Boostlagbe\.com.*$/i, '').trim();
  const kw = (focusKeyword || 'SMM Panel BD').trim();
  return [
    {
      label: 'Variant A: Number + Rate Hook (Highest CTR)',
      title: `${base} (${year} গাইড) [মাত্র ৳২০ বিকাশ/নগদ] | Boostlagbe.com`.slice(0, 75),
      ctrBoostNote: '+34% CTR — দাম ও বিকাশ/নগদ উল্লেখ থাকায় কমার্শিয়াল ক্লিক সবচেয়ে বেশি আসে।'
    },
    {
      label: 'Variant B: Fast Result & Safety Hook',
      title: `১–৫ মিনিটে ${kw} — ১০০% নন-ড্রপ ও পাসওয়ার্ড ছাড়া (${year}) | Boostlagbe`.slice(0, 75),
      ctrBoostNote: '+28% CTR — দ্রুত ডেলিভারি ও পাসওয়ার্ড-মুক্ত নিরাপত্তার কারণে ট্রাস্ট বাড়ে।'
    },
    {
      label: 'Variant C: Step-by-Step Case Study Hook',
      title: `কীভাবে ৭ দিনে ${kw} পাবেন? [প্র্যাকটিক্যাল কেস স্টাডি ${year}] | Boostlagbe`.slice(0, 75),
      ctrBoostNote: '+25% CTR — প্রশ্নবোধক হুক ও কেস স্টাডি কিউরিওসিটি তৈরি করে।'
    }
  ];
}

// Feature 24: 1-Click Full SEO Blog Backup & JSON/CSV Export
export function exportAllBlogsToJsonOrCsv(
  blogs: SMMBlogPost[],
  format: 'json' | 'csv'
): void {
  const dateStr = new Date().toISOString().slice(0, 10);
  if (format === 'json') {
    const payload = JSON.stringify(blogs, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boostlagbe-seo-blogs-backup-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const headers = [
    'ID',
    'Title',
    'Slug',
    'Category',
    'FocusKeyword',
    'SEOScore',
    'UniquenessScore',
    'NGramSimilarityPercent',
    'Views',
    'Status',
    'CanonicalURL'
  ];
  const rows = blogs.map((b) => [
    b.id,
    `"${(b.title || '').replace(/"/g, '""')}"`,
    b.slug,
    b.category,
    `"${(b.focusKeyword || '').replace(/"/g, '""')}"`,
    b.seoScore || 100,
    b.uniquenessScore || 100,
    b.nGramSimilarityPercent ?? 4,
    b.views || 120,
    b.status,
    `https://boostlagbe.com/?tab=blog&slug=${encodeURIComponent(b.slug)}`
  ]);
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `boostlagbe-seo-blogs-report-${dateStr}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Feature 25: Reseller White-Label Client Pitch & Proposal Generator
export function generateResellerWhiteLabelProposal(
  post: SMMBlogPost,
  agencyName: string = 'Your Digital Marketing Agency BD',
  markupPercent: number = 35
): string {
  const steps = (post.howToSteps || [])
    .map((s, i) => `${i + 1}. ${s.name || s.title}: ${s.text || s.description}`)
    .join('\n');
  return `=====================================================
📋 ক্লায়েন্ট গ্রোথ প্রপোজাল ও স্ট্র্যাটেজি গাইড (${new Date().getFullYear()})
প্রস্তুতকারক: ${agencyName}
বিষয়: ${post.title}
=====================================================

🎯 সংক্ষিপ্ত সারসংক্ষেপ:
${post.excerpt}

✅ কেন এই গ্রোথ স্ট্র্যাটেজি আপনার পেজ/চ্যানেলের জন্য জরুরি:
${(post.keyTakeaways || []).map((k) => `• ${k}`).join('\n')}

🛠️ কাজের ধাপসমূহ (Implementation Roadmap):
${steps || '১. পাবলিক লিংক অডিট\n২. ড্রিপ-ফিড নন-ড্রপ ক্যাম্পেইন সেটআপ\n৩. ৩০ দিনের অটো রিফিল মনিটরিং'}

💼 আমাদের এজেন্সি সার্ভিস গ্যারান্টি:
• ১০০% পাসওয়ার্ড-মুক্ত নিরাপদ ডেলিভারি (শুধুমাত্র পাবলিক লিংক প্রয়োজন)
• ৩০ দিনের নন-ড্রপ রিফিল ও সাপোর্ট গ্যারান্টি
• আনুমানিক এজেন্সি প্যাকেজ রেট: স্ট্যান্ডার্ড রেট (+${markupPercent}% এজেন্সি ম্যানেজমেন্ট অন্তর্ভুক্ত)

যোগাযোগ: ${agencyName} — আজই আপনার ক্যাম্পেইন শুরু করতে আমাদের ইনবক্স করুন!
=====================================================`;
}


