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
  SMMBlogAutopilotLog
} from '../types';
import { INITIAL_SEO_BLOG_POSTS } from '../data/seedServices';
import { sanitizeForFirestore, safeParseJsonResponse } from './db';

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

export function checkBlogDuplicateAndUniqueness(
  candidate: {
    id?: string;
    title?: string;
    slug?: string;
    focusKeyword?: string;
  },
  existingBlogs: SMMBlogPost[] = cachedBlogsList
): {
  isUnique: boolean;
  uniquenessScore: number;
  conflictReason?: string;
  conflictingPostTitle?: string;
} {
  const cSlug = (candidate.slug || '').trim().toLowerCase();
  const cFocus = (candidate.focusKeyword || '').trim().toLowerCase();
  const cTitle = (candidate.title || '').trim().toLowerCase();

  let maxOverlap = 0;
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
        conflictReason: `একই URL Slug ইতোমধ্যে ব্যবহৃত হয়েছে ("${post.slug}")`,
        conflictingPostTitle: post.title
      };
    }

    if (cFocus && cFocus !== 'boostlagbe.com' && pFocus === cFocus) {
      return {
        isUnique: false,
        uniquenessScore: 30,
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
  }

  const uniquenessScore = Math.max(40, Math.min(100, Math.round((1 - maxOverlap * 0.45) * 100)));
  if (maxOverlap >= 0.72) {
    return {
      isUnique: false,
      uniquenessScore,
      conflictReason: `টাইটেলটি পুরাতন ব্লগের সাথে অতিরিক্ত মিলে যাচ্ছে (${Math.round(maxOverlap * 100)}% মিল)।`,
      conflictingPostTitle
    };
  }

  return {
    isUnique: true,
    uniquenessScore
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

      merged.sort(
        (a, b) => (b.publishedAt || b.createdAt || 0) - (a.publishedAt || a.createdAt || 0)
      );
      cachedBlogsList = merged;
      syncBlogsToServerSitemap(merged);
      callback(merged);
    },
    () => {
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
    seoScore: Math.max(post.seoScore || 0, seoEval.score),
    uniquenessScore: post.uniquenessScore || uniquenessEval.uniquenessScore,
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
