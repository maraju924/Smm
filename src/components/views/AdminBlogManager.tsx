import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Globe,
  Search,
  Eye,
  ExternalLink,
  Save,
  RefreshCw,
  HelpCircle,
  Tag,
  Image as ImageIcon,
  FileText,
  Award,
  Code,
  ArrowLeft,
  Check,
  Zap,
  Settings,
  Link2,
  ListPlus
} from 'lucide-react';
import { SMMBlogPost, SMMBlogFaqItem, SiteSettings } from '../../types';
import {
  saveBlogPost,
  removeBlogPost,
  computeSeoScoreForBlogPost,
  generateBlogWithGeminiOnServer,
  optimizeBlogSeoWithGeminiOnServer,
  syncBlogsToServerSitemap
} from '../../services/blogSeoService';

interface AdminBlogManagerProps {
  blogs: SMMBlogPost[];
  siteSettings: SiteSettings;
  onOpenGeminiSettings: () => void;
  onPreviewBlogSlug?: (slug: string) => void;
}

const DEFAULT_COVER_IMAGE = '/assets/aistudio/file_00000000117c8208a1cede2cdfee706a_42e73997.png';

export const AdminBlogManager: React.FC<AdminBlogManagerProps> = ({
  blogs,
  siteSettings,
  onOpenGeminiSettings,
  onPreviewBlogSlug
}) => {
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Editor form states
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState(DEFAULT_COVER_IMAGE);
  const [coverImageAlt, setCoverImageAlt] = useState('');
  const [category, setCategory] = useState('Facebook');
  const [status, setStatus] = useState<'published' | 'draft'>('published');
  const [focusKeyword, setFocusKeyword] = useState('');
  const [secondaryKeywordsInput, setSecondaryKeywordsInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [metaRobots, setMetaRobots] = useState<'index, follow' | 'noindex, follow'>('index, follow');
  const [schemaType, setSchemaType] = useState<'BlogPosting' | 'NewsArticle' | 'TechArticle'>('BlogPosting');
  const [authorName, setAuthorName] = useState('Boostlagbe SEO Team');
  const [faqItems, setFaqItems] = useState<SMMBlogFaqItem[]>([
    {
      question: 'Boostlagbe.com থেকে সার্ভিস নিলে কত সময়ে ডেলিভারি পাওয়া যায়?',
      answer: 'Boostlagbe.com-এ অর্ডার করার সাথে সাথেই অটোমেটেড ক্লাউড এপিআইয়ের মাধ্যমে ১ থেকে ৫ মিনিটের মধ্যে ডেলিভারি শুরু হয়ে যায়।'
    },
    {
      question: 'পেমেন্ট কীভাবে সম্পন্ন করব?',
      answer: 'আপনি বিকাশ (bKash), নগদ (Nagad) এবং রকেটের মাধ্যমে মাত্র ২০ টাকা থেকে ইনস্ট্যান্ট ওয়ালেট ডিপোজিট করে অর্ডার করতে পারবেন।'
    }
  ]);

  // Gemini AI Blog Writer states
  const [aiTopic, setAiTopic] = useState('');
  const [aiFocusKeyword, setAiFocusKeyword] = useState('');
  const [aiCategory, setAiCategory] = useState('Facebook');
  const [aiLanguage, setAiLanguage] = useState<'bn' | 'en' | 'mixed'>(
    siteSettings.geminiDefaultLanguage || 'bn'
  );
  const [aiWordCount, setAiWordCount] = useState<number>(950);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isOptimizingSeo, setIsOptimizingSeo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [serpPreviewDevice, setSerpPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  const showNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 5000);
  };

  const secondaryKeywordsArray = useMemo(
    () =>
      secondaryKeywordsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [secondaryKeywordsInput]
  );

  const tagsArray = useMemo(
    () =>
      tagsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    [tagsInput]
  );

  const liveSeoEvaluation = useMemo(() => {
    return computeSeoScoreForBlogPost({
      title,
      slug,
      excerpt,
      content,
      coverImage,
      coverImageAlt,
      focusKeyword,
      secondaryKeywords: secondaryKeywordsArray,
      tags: tagsArray,
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || excerpt,
      schemaType,
      faqItems
    });
  }, [
    title,
    slug,
    excerpt,
    content,
    coverImage,
    coverImageAlt,
    focusKeyword,
    secondaryKeywordsArray,
    tagsArray,
    seoTitle,
    seoDescription,
    schemaType,
    faqItems
  ]);

  const filteredBlogs = useMemo(() => {
    if (!searchQuery.trim()) return blogs;
    const q = searchQuery.toLowerCase();
    return blogs.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        b.focusKeyword.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
    );
  }, [blogs, searchQuery]);

  const avgSeoScore = useMemo(() => {
    if (blogs.length === 0) return 100;
    const sum = blogs.reduce((acc, b) => acc + (b.seoScore || 98), 0);
    return Math.round(sum / blogs.length);
  }, [blogs]);

  const sanitizeSlugInput = (raw: string) => {
    return raw
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 85);
  };

  const handleStartNewPost = () => {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setCoverImage(DEFAULT_COVER_IMAGE);
    setCoverImageAlt('Boostlagbe.com - Best SMM Panel in Bangladesh');
    setCategory('Facebook');
    setStatus('published');
    setFocusKeyword('boostlagbe.com');
    setSecondaryKeywordsInput(
      'বুস্ট লাগবে, বুস্টলাগবে ডট কম, smm panel bd, facebook page boost bd, tiktok views bangladesh'
    );
    setTagsInput('Boostlagbe, SMM Panel Bangladesh, Facebook Boost, TikTok Growth');
    setSeoTitle('');
    setSeoDescription('');
    setCanonicalUrl('');
    setMetaRobots('index, follow');
    setSchemaType('BlogPosting');
    setAuthorName('Boostlagbe SEO Team');
    setFaqItems([
      {
        question: 'Boostlagbe.com থেকে সার্ভিস নিলে কত সময়ে ডেলিভারি পাওয়া যায়?',
        answer:
          'Boostlagbe.com-এ অর্ডার করার সাথে সাথেই অটোমেটেড ক্লাউড এপিআইয়ের মাধ্যমে ১ থেকে ৫ মিনিটের মধ্যে ডেলিভারি শুরু হয়ে যায়।'
      },
      {
        question: 'পেমেন্ট কীভাবে সম্পন্ন করব?',
        answer:
          'আপনি বিকাশ (bKash), নগদ (Nagad) এবং রকেটের মাধ্যমে মাত্র ২০ টাকা থেকে ইনস্ট্যান্ট ওয়ালেট ডিপোজিট করে অর্ডার করতে পারবেন।'
      }
    ]);
    setMode('editor');
  };

  const handleEditPost = (post: SMMBlogPost) => {
    setEditingId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setExcerpt(post.excerpt);
    setContent(post.content);
    setCoverImage(post.coverImage || DEFAULT_COVER_IMAGE);
    setCoverImageAlt(post.coverImageAlt || post.title);
    setCategory(post.category || 'Facebook');
    setStatus(post.status || 'published');
    setFocusKeyword(post.focusKeyword || 'boostlagbe.com');
    setSecondaryKeywordsInput((post.secondaryKeywords || []).join(', '));
    setTagsInput((post.tags || []).join(', '));
    setSeoTitle(post.seoTitle || post.title);
    setSeoDescription(post.seoDescription || post.excerpt);
    setCanonicalUrl(post.canonicalUrl || '');
    setMetaRobots(post.metaRobots || 'index, follow');
    setSchemaType(post.schemaType || 'BlogPosting');
    setAuthorName(post.authorName || 'Boostlagbe SEO Team');
    setFaqItems(
      post.faqItems && post.faqItems.length > 0
        ? post.faqItems
        : [
            {
              question: 'Boostlagbe.com কীভাবে কাজ করে?',
              answer: 'Boostlagbe.com শতভাগ অটোমেটেড এসএমএম প্যানেল হিসেবে কাজ করে।'
            }
          ]
    );
    setMode('editor');
  };

  const handleDeletePost = async (post: SMMBlogPost) => {
    try {
      await removeBlogPost(post.id);
      showNotice('success', `"${post.title}" ব্লগ পোস্টটি ডিলিট এবং সাইটম্যাপ আপডেট করা হয়েছে।`);
    } catch (err: any) {
      showNotice('error', err?.message || 'ব্লগ পোস্ট ডিলিট করতে সমস্যা হয়েছে।');
    }
  };

  const handleGenerateWithGemini = async () => {
    const targetTopic = aiTopic.trim() || title.trim();
    if (!targetTopic) {
      showNotice('error', 'দয়া করে ব্লগের টপিক বা শিরোনাম লিখুন (যেমন: ফেসবুক পেজ মনিটাইজেশন গাইড)।');
      return;
    }

    setIsGeneratingAi(true);
    try {
      const result = await generateBlogWithGeminiOnServer({
        topic: targetTopic,
        focusKeyword: aiFocusKeyword.trim() || focusKeyword.trim() || targetTopic,
        category: aiCategory || category,
        language: aiLanguage,
        targetWordCount: aiWordCount,
        apiKey: siteSettings.geminiApiKey,
        model: siteSettings.geminiModel || 'gemini-2.5-flash',
        includeInternalLinks: siteSettings.geminiAutoInternalLinks !== false,
        includeFaqSchema: siteSettings.geminiAutoFaqSchema !== false
      });

      const gen = result.blog;
      if (gen.title) setTitle(gen.title);
      if (gen.slug) setSlug(sanitizeSlugInput(gen.slug));
      if (gen.excerpt) setExcerpt(gen.excerpt);
      if (gen.content) setContent(gen.content);
      if (gen.seoTitle) setSeoTitle(gen.seoTitle);
      if (gen.seoDescription) setSeoDescription(gen.seoDescription);
      if (gen.focusKeyword) setFocusKeyword(gen.focusKeyword);
      if (gen.coverImageAlt) setCoverImageAlt(gen.coverImageAlt);
      if (Array.isArray(gen.secondaryKeywords) && gen.secondaryKeywords.length > 0) {
        setSecondaryKeywordsInput(gen.secondaryKeywords.join(', '));
      }
      if (Array.isArray(gen.tags) && gen.tags.length > 0) {
        setTagsInput(gen.tags.join(', '));
      }
      if (Array.isArray(gen.faqItems) && gen.faqItems.length > 0) {
        setFaqItems(gen.faqItems);
      }
      if (aiCategory) setCategory(aiCategory);

      showNotice(
        'success',
        `Google Gemini AI দিয়ে ১০০% SEO অপ্টিমাইজড ব্লগ তৈরি হয়েছে! (${
          result.source === 'gemini_ai' ? result.modelUsed : 'Built-in SEO Engine'
        })`
      );
    } catch (err: any) {
      showNotice('error', err?.message || 'Gemini AI দিয়ে ব্লগ জেনারেট করতে সমস্যা হয়েছে।');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleAutoOptimizeSeo = async () => {
    if (!title.trim() && !content.trim()) {
      showNotice('error', 'প্রথমে ব্লগের টাইটেল অথবা কন্টেন্ট লিখুন।');
      return;
    }

    setIsOptimizingSeo(true);
    try {
      const optimized = await optimizeBlogSeoWithGeminiOnServer({
        title: title.trim() || 'Boostlagbe.com SMM Guide',
        content: content.trim() || excerpt.trim() || title.trim(),
        focusKeyword: focusKeyword.trim() || 'boostlagbe.com',
        apiKey: siteSettings.geminiApiKey,
        model: siteSettings.geminiModel || 'gemini-2.5-flash'
      });

      if (optimized.seoTitle) setSeoTitle(optimized.seoTitle);
      if (optimized.seoDescription) setSeoDescription(optimized.seoDescription);
      if (optimized.slug) setSlug(sanitizeSlugInput(optimized.slug));
      if (optimized.focusKeyword) setFocusKeyword(optimized.focusKeyword);
      if (optimized.coverImageAlt) setCoverImageAlt(optimized.coverImageAlt);
      if (Array.isArray(optimized.secondaryKeywords) && optimized.secondaryKeywords.length > 0) {
        setSecondaryKeywordsInput(optimized.secondaryKeywords.join(', '));
      }
      if (Array.isArray(optimized.tags) && optimized.tags.length > 0) {
        setTagsInput(optimized.tags.join(', '));
      }
      if (Array.isArray(optimized.faqItems) && optimized.faqItems.length >= 2) {
        setFaqItems(optimized.faqItems);
      }

      showNotice('success', '১০০% গুগল র‍্যাংকিংয়ের জন্য সব মেটা ট্যাগ, স্লাগ ও FAQ স্কিমা অটো-অপ্টিমাইজ করা হয়েছে!');
    } catch (err: any) {
      showNotice('error', err?.message || 'SEO অপ্টিমাইজ করতে সমস্যা হয়েছে।');
    } finally {
      setIsOptimizingSeo(false);
    }
  };

  const handleSavePost = async () => {
    if (!title.trim()) {
      showNotice('error', 'ব্লগ পোস্টের একটি শিরোনাম (Title) দিন।');
      return;
    }
    if (!content.trim()) {
      showNotice('error', 'ব্লগ পোস্টের মূল কন্টেন্ট লিখুন অথবা Gemini AI দিয়ে জেনারেট করুন।');
      return;
    }

    const finalSlug =
      sanitizeSlugInput(slug) ||
      sanitizeSlugInput(focusKeyword) ||
      `boostlagbe-guide-${Date.now().toString(36)}`;

    const existingPost = editingId ? blogs.find((b) => b.id === editingId) : null;
    const now = Date.now();

    const postObj: SMMBlogPost = {
      id: editingId || `blog-${now.toString(36)}`,
      title: title.trim(),
      slug: finalSlug,
      excerpt:
        excerpt.trim() ||
        seoDescription.trim() ||
        `${title.trim()} - Boostlagbe.com অফিসিয়াল গাইড।`,
      content: content.trim(),
      coverImage: coverImage.trim() || DEFAULT_COVER_IMAGE,
      coverImageAlt: coverImageAlt.trim() || `${title.trim()} - Boostlagbe.com`,
      category: category || 'Facebook',
      tags: tagsArray.length > 0 ? tagsArray : ['Boostlagbe', 'SMM Panel Bangladesh'],
      focusKeyword: focusKeyword.trim() || 'boostlagbe.com',
      secondaryKeywords:
        secondaryKeywordsArray.length > 0
          ? secondaryKeywordsArray
          : ['বুস্ট লাগবে', 'বুস্টলাগবে ডট কম', 'smm panel bd'],
      seoTitle: (seoTitle.trim() || `${title.trim()} | Boostlagbe.com`).slice(0, 75),
      seoDescription: (
        seoDescription.trim() ||
        excerpt.trim() ||
        `${title.trim()} নিয়ে সম্পূর্ণ গাইড পড়ুন Boostlagbe.com-এ।`
      ).slice(0, 175),
      canonicalUrl:
        canonicalUrl.trim() || `https://boostlagbe.com/?tab=blog&slug=${encodeURIComponent(finalSlug)}`,
      ogType: 'article',
      schemaType,
      metaRobots,
      readingTimeMinutes: liveSeoEvaluation.readingTimeMinutes,
      wordCount: liveSeoEvaluation.wordCount,
      seoScore: liveSeoEvaluation.score,
      faqItems: faqItems.filter((f) => f.question.trim() && f.answer.trim()),
      authorName: authorName.trim() || 'Boostlagbe SEO Team',
      authorRole: 'SMM & SEO Specialist',
      status,
      views: existingPost?.views || 125,
      aiGenerated: true,
      publishedAt: existingPost?.publishedAt || now,
      createdAt: existingPost?.createdAt || now,
      updatedAt: now
    };

    setIsSaving(true);
    try {
      await saveBlogPost(postObj);
      showNotice(
        'success',
        `ব্লগ পোস্টটি সফলভাবে পাবলিশ হয়েছে (SEO Score: ${liveSeoEvaluation.score}/100) এবং /sitemap.xml-এ যুক্ত হয়েছে!`
      );
      setMode('list');
    } catch (err: any) {
      showNotice('error', err?.message || 'ব্লগ পোস্ট সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setIsSaving(false);
    }
  };

  const insertHtmlSnippet = (snippet: string) => {
    setContent((prev) => `${prev ? prev + '\n\n' : ''}${snippet}`);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 900 * 1024) {
      showNotice('error', 'ইমেজ ফাইল ৯০০ KB এর নিচে হতে হবে অথবা ডিরেক্ট ইমেজ লিংক ব্যবহার করুন।');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCoverImage(reader.result);
        showNotice('success', 'কভার ইমেজ সফলভাবে যুক্ত হয়েছে!');
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      {/* Feedback Notification Banner */}
      {feedbackBanner && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-sm ${
            feedbackBanner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : feedbackBanner.type === 'error'
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackBanner.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span>{feedbackBanner.text}</span>
          </div>
          <button
            onClick={() => setFeedbackBanner(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Top SEO Blog CMS Header Card */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 border border-indigo-500/20 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" /> 100% Advanced Google SEO Blog Engine + Gemini AI
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              অ্যাডভান্সড এসইও ব্লগ ম্যানেজার ও Gemini AI রাইটার
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Google Gemini AI দিয়ে ১-ক্লিকে ১০০% অপ্টিমাইজড ব্লগ লিখুন। প্রতিটি ব্লগে স্বয়ংক্রিয়ভাবে{' '}
              <span className="text-emerald-300 font-bold">Schema.org BlogPosting + FAQPage</span>,{' '}
              <span className="text-emerald-300 font-bold">Canonical URL</span> এবং{' '}
              <span className="text-emerald-300 font-bold">/sitemap.xml</span> রিয়েল-টাইম আপডেট হয়।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenGeminiSettings}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Settings className="w-4 h-4 text-indigo-300" />
              <span>
                Gemini API সেটিংস{' '}
                {siteSettings.geminiApiKey ? (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                    যুক্ত আছে
                  </span>
                ) : (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                    কনফিগার করুন
                  </span>
                )}
              </span>
            </button>

            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => syncBlogsToServerSitemap(blogs)}
              className="px-4 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Globe className="w-4 h-4" /> লাইভ Sitemap.xml দেখুন
            </a>

            {mode === 'list' ? (
              <button
                onClick={handleStartNewPost}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-md transition-all"
              >
                <Plus className="w-4 h-4" /> নতুন SEO ব্লগ লিখুন
              </button>
            ) : (
              <button
                onClick={() => setMode('list')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> সব ব্লগ লিস্টে ফিরুন
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-400 block">মোট প্রকাশিত ব্লগ</span>
            <span className="text-lg font-extrabold text-white">
              {blogs.filter((b) => b.status === 'published').length} টি পোস্ট
            </span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-400 block">গড় গুগল SEO স্কোর</span>
            <span className="text-lg font-extrabold text-emerald-400">{avgSeoScore}/100 (A+)</span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-400 block">Sitemap.xml অটো-ইন্ডেক্স</span>
            <span className="text-xs font-extrabold text-indigo-300 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> শতভাগ সক্রিয় (Synced)
            </span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-400 block">Google Gemini AI ইঞ্জিন</span>
            <span className="text-xs font-extrabold text-amber-300 flex items-center gap-1 mt-1">
              <Sparkles className="w-4 h-4 text-amber-400" />{' '}
              {siteSettings.geminiModel || 'gemini-2.5-flash'} রেডি
            </span>
          </div>
        </div>
      </div>

      {mode === 'list' ? (
        /* ==========================================
           BLOG POSTS LIST & SITEMAP TABLE
           ========================================== */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ব্লগের টাইটেল, স্লাগ বা কীওয়ার্ড দিয়ে খুঁজুন..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={() => {
                syncBlogsToServerSitemap(blogs);
                showNotice('success', 'সব প্রকাশিত ব্লগ পোস্ট /sitemap.xml-এ সিঙ্ক করা হয়েছে!');
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-indigo-500" /> Sitemap ফোর্স আপডেট করুন
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredBlogs.map((post) => {
              const score = post.seoScore || computeSeoScoreForBlogPost(post).score;
              return (
                <div
                  key={post.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs hover:border-indigo-500/40 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={post.coverImage || DEFAULT_COVER_IMAGE}
                      alt={post.coverImageAlt || post.title}
                      className="w-20 h-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 hidden sm:block"
                    />
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                            post.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {post.status === 'published' ? 'Published • Sitemap Indexed' : 'Draft'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                          {post.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold flex items-center gap-1">
                          <Award className="w-3 h-3" /> SEO Score: {score}/100
                        </span>
                      </div>

                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {post.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        <span>/?tab=blog&slug={post.slug}</span>
                        <span>•</span>
                        <span>Focus KW: {post.focusKeyword}</span>
                        <span>•</span>
                        <span>{post.wordCount || 450} words</span>
                        <span>•</span>
                        <span>{(post.faqItems || []).length} FAQs Schema</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {onPreviewBlogSlug && (
                      <button
                        onClick={() => onPreviewBlogSlug(post.slug)}
                        className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-500" /> প্রিভিউ
                      </button>
                    )}
                    <button
                      onClick={() => handleEditPost(post)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> এডিট ও SEO
                    </button>
                    <button
                      onClick={() => handleDeletePost(post)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors"
                      title="Delete Blog Post"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ==========================================
           FULL BLOG EDITOR + GEMINI AI WRITER + 100% SEO SCORE ANALYZER
           ========================================== */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT 8 COLS: AI GENERATOR + CONTENT & SCHEMA EDITOR */}
          <div className="xl:col-span-8 space-y-6">
            {/* 1. GOOGLE GEMINI AI 1-CLICK BLOG WRITER */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 dark:from-indigo-950/60 dark:to-slate-900 rounded-3xl border border-indigo-500/30 p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Google Gemini AI দিয়ে ১-ক্লিকে ১০০% SEO ব্লগ লিখুন
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      টপিক এবং টার্গেট কীওয়ার্ড দিলেই Gemini AI সম্পূর্ণ H2/H3 হেডিং, মেটা ট্যাগ, ইন্টারনাল লিংক ও FAQ স্কিমাসহ আর্টিকেল লিখে দেবে।
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onOpenGeminiSettings}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <Settings className="w-3.5 h-3.5" /> Gemini API Key সেটআপ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ব্লগের টপিক বা বিষয়বস্তু (Blog Topic / Title Prompt) *
                  </label>
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="যেমন: কীভাবে মাত্র ৭ দিনে ফেসবুক পেজে ১০ হাজার ফলোয়ার ও মনিটাইজেশন পাবেন"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    টার্গেট ফোকাস কীওয়ার্ড (Focus Keyword)
                  </label>
                  <input
                    type="text"
                    value={aiFocusKeyword}
                    onChange={(e) => setAiFocusKeyword(e.target.value)}
                    placeholder="যেমন: facebook page boost bd বা boostlagbe.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ক্যাটাগরি
                    </label>
                    <select
                      value={aiCategory}
                      onChange={(e) => setAiCategory(e.target.value)}
                      className="w-full px-2.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="Facebook">Facebook</option>
                      <option value="TikTok">TikTok</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Telegram">Telegram</option>
                      <option value="SMM Guide">SMM Guide</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ভাষা (Language)
                    </label>
                    <select
                      value={aiLanguage}
                      onChange={(e) => setAiLanguage(e.target.value as 'bn' | 'en' | 'mixed')}
                      className="w-full px-2.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    >
                      <option value="bn">বাংলা + SEO</option>
                      <option value="mixed">Bangla + English</option>
                      <option value="en">100% English</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      শব্দ সংখ্যা
                    </label>
                    <select
                      value={aiWordCount}
                      onChange={(e) => setAiWordCount(Number(e.target.value))}
                      className="w-full px-2.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    >
                      <option value={800}>800+ Words</option>
                      <option value={1000}>1000+ Words</option>
                      <option value={1500}>1500+ Words</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  * Gemini AI স্বয়ংক্রিয়ভাবে ১০০/১০০ SEO স্কোরের জন্য প্রয়োজনীয় সব হেডিং, মেটা ট্যাগ ও FAQ তৈরি করবে।
                </span>
                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={handleGenerateWithGemini}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-2 shadow-md transition-all"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Gemini AI আর্টিকেল লিখছে...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> Gemini AI দিয়ে সম্পূর্ণ ব্লগ জেনারেট করুন
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. MAIN ARTICLE CONTENT FORM */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> ব্লগ পোস্ট কন্টেন্ট ও স্ট্রাকচার
                </h3>
                <button
                  type="button"
                  disabled={isOptimizingSeo}
                  onClick={handleAutoOptimizeSeo}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                >
                  {isOptimizingSeo ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Zap className="w-3.5 h-3.5" />
                  )}
                  ১-ক্লিকে ১০০% SEO অটো-অপ্টিমাইজ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ব্লগ পোস্টের মূল শিরোনাম (H1 Blog Headline) *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!seoTitle) setSeoTitle(`${e.target.value} | Boostlagbe.com`);
                    }}
                    placeholder="যেমন: Boostlagbe.com (বুস্ট লাগবে): বাংলাদেশের সেরা অটোমেটেড এসএমএম প্যানেল গাইড"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    SEO Friendly URL Slug (ইংরেজি ছোট হাতের অক্ষর ও হাইফেন) *
                  </label>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(sanitizeSlugInput(e.target.value))}
                    placeholder="boostlagbe-best-smm-panel-bangladesh"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ক্যাটাগরি
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="Facebook">Facebook</option>
                      <option value="TikTok">TikTok</option>
                      <option value="YouTube">YouTube</option>
                      <option value="Instagram">Instagram</option>
                      <option value="Telegram">Telegram</option>
                      <option value="SMM Guide">SMM Guide</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      পাবলিশ স্ট্যাটাস
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'published' | 'draft')}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                    >
                      <option value="published">Published (Live + Sitemap)</option>
                      <option value="draft">Draft (খসড়া)</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    সংক্ষিপ্ত সারাংশ (Article Excerpt / Summary)
                  </label>
                  <textarea
                    rows={2}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="ব্লগ কার্ড এবং সোশ্যাল শেয়ারে দেখানোর জন্য ২ লাইনের আকর্ষণীয় সারাংশ লিখুন..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Quick HTML Formatting Toolbar */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    মূল আর্টিকেল বডি (Semantic HTML with H2, H3, Lists & Internal Links) *
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        insertHtmlSnippet('<h2>নতুন সেকশন সাবহেডিং (H2 Heading)</h2>\n<p>এখানে বিস্তারিত লিখুন...</p>')
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50"
                    >
                      + H2 Heading
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertHtmlSnippet('<h3>গুরুত্বপূর্ণ পয়েন্ট (H3 Subheading)</h3>\n<p>এখানে বিস্তারিত লিখুন...</p>')
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50"
                    >
                      + H3 Heading
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertHtmlSnippet(
                          '<ul>\n  <li><strong>প্রথম সুবিধা:</strong> ইনস্ট্যান্ট অটোমেটেড ডেলিভারি।</li>\n  <li><strong>দ্বিতীয় সুবিধা:</strong> বিকাশ ও নগদে পেমেন্ট।</li>\n</ul>'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50"
                    >
                      + Bullet List
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        insertHtmlSnippet(
                          '<p>আজই সেরা দামে অর্ডার করতে আমাদের <a href="/?tab=services"><strong>Boostlagbe.com সার্ভিস লিস্ট</strong></a> অথবা <a href="/?tab=new_order"><strong>নিউ অর্ডার পেজ</strong></a> ভিজিট করুন।</p>'
                        )
                      }
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 flex items-center gap-1"
                    >
                      <Link2 className="w-3 h-3" /> + Internal SEO Link
                    </button>
                  </div>
                </div>

                <textarea
                  rows={14}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="এখানে আপনার আর্টিকেল লিখুন অথবা উপরের Gemini AI বাটনে ক্লিক করে ১-ক্লিকে সম্পূর্ণ আর্টিকেল জেনারেট করুন..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Cover Image + SEO Alt Attribute */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ফিচার্ড কভার ইমেজ URL অথবা আপলোড
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                    />
                    <label className="px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold cursor-pointer shrink-0 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5" /> আপলোড
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ইমেজ SEO Alt Text (গুগল ইমেজ সার্চ র‍্যাংকিংয়ের জন্য) *
                  </label>
                  <input
                    type="text"
                    value={coverImageAlt}
                    onChange={(e) => setCoverImageAlt(e.target.value)}
                    placeholder="Boostlagbe.com - Facebook Page Boost & SMM Panel Bangladesh"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* 3. TECHNICAL SEO META TAGS, KEYWORDS & FAQ SCHEMA BUILDER */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-xs">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Code className="w-4 h-4 text-indigo-500" /> অ্যাডভান্সড টেকনিক্যাল SEO, মেটা ট্যাগ ও FAQPage স্কিমা
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Focus Keyword (মূল টার্গেট কীওয়ার্ড) *
                  </label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    placeholder="boostlagbe.com"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Topic Tags (কমা দিয়ে লিখুন)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Boostlagbe, Facebook Boost, TikTok Views, SMM Panel BD"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Secondary / LSI Ranking Keywords (কমা দিয়ে আলাদা করুন)
                  </label>
                  <input
                    type="text"
                    value={secondaryKeywordsInput}
                    onChange={(e) => setSecondaryKeywordsInput(e.target.value)}
                    placeholder="বুস্ট লাগবে, বুস্টলাগবে ডট কম, boost lagbe, smm panel bangladesh, facebook followers bd"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Google SERP Meta Title (৩০-৭৫ ক্যারেক্টার অপ্টিমাল)
                    </label>
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        (seoTitle || title).length >= 30 && (seoTitle || title).length <= 75
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }`}
                    >
                      {(seoTitle || title).length} / 70 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="গুগল সার্চ রেজাল্টে যে নীল রঙের টাইটেল দেখাবে..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Google SERP Meta Description (৯০-১৭৫ ক্যারেক্টার অপ্টিমাল)
                    </label>
                    <span
                      className={`text-[11px] font-mono font-bold ${
                        (seoDescription || excerpt).length >= 90 &&
                        (seoDescription || excerpt).length <= 180
                          ? 'text-emerald-500'
                          : 'text-amber-500'
                      }`}
                    >
                      {(seoDescription || excerpt).length} / 160 chars
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder="গুগল সার্চে টাইটেলের নিচে যে বিবরণ দেখাবে..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Schema.org Structured Data Type
                  </label>
                  <select
                    value={schemaType}
                    onChange={(e) =>
                      setSchemaType(e.target.value as 'BlogPosting' | 'NewsArticle' | 'TechArticle')
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="BlogPosting">BlogPosting (Recommended)</option>
                    <option value="TechArticle">TechArticle (Step-by-Step Guide)</option>
                    <option value="NewsArticle">NewsArticle (Update / News)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Googlebot Robots Indexing Directive
                  </label>
                  <select
                    value={metaRobots}
                    onChange={(e) =>
                      setMetaRobots(e.target.value as 'index, follow' | 'noindex, follow')
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="index, follow">index, follow (Google #1 Indexing)</option>
                    <option value="noindex, follow">noindex, follow (Hide from Search)</option>
                  </select>
                </div>
              </div>

              {/* FAQPage Schema Builder */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-indigo-500" /> Google Rich Snippet FAQPage Schema (প্রশ্ন ও উত্তর)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      এখানে প্রশ্ন-উত্তর দিলে গুগল সার্চ রেজাল্টের নিচে সরাসরি ড্রপডাউন প্রশ্ন-উত্তর (Rich Snippet) শো করবে।
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFaqItems((prev) => [...prev, { question: '', answer: '' }])
                    }
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center gap-1"
                  >
                    <ListPlus className="w-3.5 h-3.5" /> নতুন প্রশ্ন যোগ করুন
                  </button>
                </div>

                <div className="space-y-3">
                  {faqItems.map((faq, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400">
                          FAQ #{idx + 1}
                        </span>
                        {faqItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setFaqItems((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="text-[11px] text-rose-500 hover:underline"
                          >
                            মুছে ফেলুন
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={faq.question}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFaqItems((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, question: val } : item))
                          );
                        }}
                        placeholder="প্রশ্ন লিখুন..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                      />
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFaqItems((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, answer: val } : item))
                          );
                        }}
                        placeholder="উত্তর লিখুন..."
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Save / Publish Button Bar */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
                >
                  বাতিল করুন
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSavePost}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-md transition-all"
                >
                  <Save className="w-4 h-4" />
                  {isSaving
                    ? 'সেভ ও Sitemap আপডেট হচ্ছে...'
                    : `ব্লগ পাবলিশ ও Sitemap আপডেট করুন (SEO: ${liveSeoEvaluation.score}/100)`}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT 4 COLS: LIVE GOOGLE SERP PREVIEW + 12-POINT 100% SEO SCORE CHECKLIST */}
          <div className="xl:col-span-4 space-y-6">
            {/* Live SEO Score Meter Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                    Real-Time Rank Math / Yoast Grader
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    লাইভ গুগল SEO স্কোর
                  </h3>
                </div>
                <div
                  className={`px-3.5 py-2 rounded-2xl font-extrabold text-lg border ${
                    liveSeoEvaluation.score >= 90
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : liveSeoEvaluation.score >= 70
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {liveSeoEvaluation.score} / 100
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    liveSeoEvaluation.score >= 90
                      ? 'bg-emerald-500'
                      : liveSeoEvaluation.score >= 70
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${liveSeoEvaluation.score}%` }}
                />
              </div>

              {liveSeoEvaluation.score < 100 && (
                <button
                  type="button"
                  disabled={isOptimizingSeo}
                  onClick={handleAutoOptimizeSeo}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" /> ১-ক্লিকে ১০০/১০০ SEO ফিক্স করুন
                </button>
              )}

              {/* 12-Point Checklist */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 max-h-96 overflow-y-auto pr-1">
                {liveSeoEvaluation.checks.map((chk) => (
                  <div
                    key={chk.id}
                    className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                      chk.passed
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-900/40'
                        : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40'
                    }`}
                  >
                    {chk.passed ? (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {chk.label}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          +{chk.points}%
                        </span>
                      </div>
                      {!chk.passed && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {chk.tip}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Google Search Snippet (SERP) Preview */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-500" /> Google SERP প্রিভিউ
                </h3>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setSerpPreviewDevice('mobile')}
                    className={`px-2.5 py-1 rounded-lg ${
                      serpPreviewDevice === 'mobile'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    মোবাইল
                  </button>
                  <button
                    type="button"
                    onClick={() => setSerpPreviewDevice('desktop')}
                    className={`px-2.5 py-1 rounded-lg ${
                      serpPreviewDevice === 'desktop'
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                        : 'text-slate-500'
                    }`}
                  >
                    ডেস্কটপ
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2">
                  <img
                    src="/assets/aistudio/file_00000000117c8208a1cede2cdfee706a_42e73997.png"
                    alt="Boostlagbe.com"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <div className="leading-tight">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      Boostlagbe.com
                    </span>
                    <span className="text-[11px] text-slate-500 block truncate max-w-[230px]">
                      https://boostlagbe.com › blog › {slug || 'seo-guide'}
                    </span>
                  </div>
                </div>

                <h4 className="text-base font-bold text-blue-600 dark:text-blue-400 hover:underline leading-snug line-clamp-2">
                  {seoTitle || title || 'Boostlagbe.com - Best Automated SMM Panel in Bangladesh'}
                </h4>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                  {seoDescription ||
                    excerpt ||
                    'ফেসবুক পেজ মনিটাইজেশন, টিকটক ভিউ, ইউটিউব সাবস্ক্রাইবার এবং ইনস্ট্যান্ট সোশ্যাল মিডিয়া বুস্ট সার্ভিস নিন Boostlagbe.com থেকে।'}
                </p>

                {/* Rich FAQ Preview in Google SERP */}
                {faqItems.length > 0 && faqItems[0].question && (
                  <div className="pt-2 mt-2 border-t border-slate-200/70 dark:border-slate-800 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                      Google FAQ Rich Snippet Active:
                    </span>
                    {faqItems.slice(0, 2).map((f, i) => (
                      <div
                        key={i}
                        className="text-[11px] text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-800 flex items-center justify-between"
                      >
                        <span className="truncate">{f.question}</span>
                        <span className="text-slate-400 ml-2">▼</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
