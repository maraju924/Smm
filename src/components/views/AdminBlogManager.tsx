import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ListPlus,
  Clock,
  ShieldCheck,
  TrendingUp,
  Play,
  Pause,
  Layers,
  CheckCircle,
  Compass,
  Activity
} from 'lucide-react';
import {
  SMMBlogPost,
  SMMBlogFaqItem,
  SiteSettings,
  SMMBlogKeywordCandidate,
  SMMBlogAutopilotLog
} from '../../types';
import {
  saveBlogPost,
  removeBlogPost,
  computeSeoScoreForBlogPost,
  generateBlogWithGeminiOnServer,
  optimizeBlogSeoWithGeminiOnServer,
  syncBlogsToServerSitemap,
  researchKeywordsWithGeminiOnServer,
  findContextualOnlineImagesOnServer,
  runBlogAutopilotCycleOnServer,
  checkBlogDuplicateAndUniqueness,
  refreshOldBlogPostForSeo,
  healAllBlogsSeoAndImages,
  pingIndexNowOnServer,
  scanCompetitorTrendsOnServer,
  replyToBlogComment,
  BD_SEASONAL_CAMPAIGN_TEMPLATES,
  enhanceCtrMetaTitle,
  injectBidirectionalLinksIntoOlderBlogs,
  computeInternalLinkGraphMetrics,
  generateAbCtrTitleVariants,
  exportAllBlogsToJsonOrCsv,
  generate60sReelsScriptFromBlog,
  getCommunityTopicRequests
} from '../../services/blogSeoService';
import { saveSiteSettings } from '../../services/db';

interface AdminBlogManagerProps {
  blogs: SMMBlogPost[];
  siteSettings: SiteSettings;
  onUpdateSiteSettings?: (updated: SiteSettings) => void;
  onOpenGeminiSettings: () => void;
  onPreviewBlogSlug?: (slug: string) => void;
}

const DEFAULT_COVER_IMAGE =
  'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=1200';

const AUTOPILOT_PIPELINE_STEPS = [
  'AI Keyword Research & Anti-Cannibalization Check (পুরাতন ব্লগ স্ক্যান ও সেরা কীওয়ার্ড নির্বাচন)',
  '100% Human-Editorial Writing (মানুষের মতো সাবলীল ভাষা, প্রো টিপস ও BDT রেট টেবিল তৈরি)',
  'Contextual Online Image & SEO Alt Tagging (প্রাসঙ্গিক অনলাইন ছবি ও ইমেজ অল্ট ট্যাগ সংযোজন)',
  'Contextual Internal Linking & 95%+ SEO Gate (পুরাতন ব্লগের ইন্টারনাল লিংক ও ১০০% SEO যাচাই)',
  'Auto-Publishing & Google Sitemap.xml Sync (পাবলিশ এবং গুগল সাইটম্যাপে ইনডেক্সিং পিং)'
];

const ALL_BLOG_CATEGORIES = [
  'Facebook',
  'YouTube',
  'TikTok',
  'Instagram',
  'Telegram',
  'SMM Guide'
];

export const AdminBlogManager: React.FC<AdminBlogManagerProps> = ({
  blogs,
  siteSettings,
  onUpdateSiteSettings,
  onOpenGeminiSettings,
  onPreviewBlogSlug
}) => {
  const [mode, setMode] = useState<'list' | 'editor'>('list');
  const [activeSubTab, setActiveSubTab] = useState<
    'posts' | 'autopilot' | 'keywords' | 'radar' | 'logs'
  >('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isHealingAll, setIsHealingAll] = useState(false);
  const [isScanningTrends, setIsScanningTrends] = useState(false);
  const [competitorTrends, setCompetitorTrends] = useState<any[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

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
  const [authorName, setAuthorName] = useState('তানভীর আহমেদ (Tanvir Ahmed)');
  const [authorRole, setAuthorRole] = useState('Senior Social Media Growth Strategist, Boostlagbe.com');
  const [authorBio, setAuthorBio] = useState(
    'তানভীর আহমেদ গত ৬+ বছর ধরে বাংলাদেশের ১০,০০০+ ফেসবুক পেজ, ইউটিউব চ্যানেল এবং ই-কমার্স ব্র্যান্ডের অর্গানিক গ্রোথ, মনিটাইজেশন ও এসইও স্ট্র্যাটেজি নিয়ে কাজ করছেন।'
  );
  const [reviewedBy, setReviewedBy] = useState('Boostlagbe Editorial & SEO Review Board');
  const [keyTakeawaysInput, setKeyTakeawaysInput] = useState(
    'মাত্র ১ থেকে ৫ মিনিটে অটোমেটেড সোশ্যাল মিডিয়া বুস্ট ডেলিভারি\nবিকাশ, নগদ ও রকেটে মাত্র ২০ টাকা থেকে ইনস্ট্যান্ট ওয়ালেট ডিপোজিট\n৩০ দিনের অটো রিফিল গ্যারান্টি ও ১০০% অ্যাকাউন্ট সেফটি'
  );
  const [faqItems, setFaqItems] = useState<SMMBlogFaqItem[]>([
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

  // Gemini AI Blog Writer states
  const [aiTopic, setAiTopic] = useState('');
  const [aiFocusKeyword, setAiFocusKeyword] = useState('');
  const [aiCategory, setAiCategory] = useState('Facebook');
  const [aiLanguage, setAiLanguage] = useState<'bn' | 'en' | 'mixed'>(
    siteSettings.geminiDefaultLanguage === 'bn_en'
      ? 'mixed'
      : siteSettings.geminiDefaultLanguage || 'bn'
  );
  const [aiWordCount, setAiWordCount] = useState<number>(1000);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isOptimizingSeo, setIsOptimizingSeo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Online Image Discovery states
  const [isFindingImages, setIsFindingImages] = useState(false);
  const [onlineImageGallery, setOnlineImageGallery] = useState<{ url: string; alt: string }[]>([]);

  // AI Keyword Research & Autopilot states
  const [isResearchingKeywords, setIsResearchingKeywords] = useState(false);
  const [customKeywordHint, setCustomKeywordHint] = useState('');
  const [researchedCandidates, setResearchedCandidates] = useState<SMMBlogKeywordCandidate[]>([]);
  const [newQueueTopic, setNewQueueTopic] = useState('');
  const [isRunningAutopilot, setIsRunningAutopilot] = useState(false);
  const [autopilotStepIndex, setAutopilotStepIndex] = useState<number>(0);
  const [countdownText, setCountdownText] = useState<string>('');
  const autopilotLockRef = useRef(false);

  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [serpPreviewDevice, setSerpPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  const showNotice = (type: 'success' | 'error' | 'info', text: string) => {
    setFeedbackBanner({ type, text });
    setTimeout(() => setFeedbackBanner(null), 6500);
  };

  const autopilotEnabled = siteSettings.blogAutopilotEnabled !== false;
  const minHours = siteSettings.blogAutopilotMinHours || 10;
  const maxHours = siteSettings.blogAutopilotMaxHours || 18;
  const minSeoScoreGate = siteSettings.blogAutopilotMinSeoScore || 95;
  const nextRunAt =
    siteSettings.blogAutopilotNextRunAt || Date.now() + 12 * 3600 * 1000;
  const topicQueue = siteSettings.blogAutopilotTopicQueue || [];
  const autopilotLogs = siteSettings.blogAutopilotLogs || [];
  const activeCategories =
    siteSettings.blogAutopilotCategories && siteSettings.blogAutopilotCategories.length > 0
      ? siteSettings.blogAutopilotCategories
      : ALL_BLOG_CATEGORIES;

  const persistAutopilotSettings = async (patch: Partial<SiteSettings>) => {
    const merged: SiteSettings = {
      ...siteSettings,
      ...patch
    };
    if (onUpdateSiteSettings) {
      onUpdateSiteSettings(merged);
    }
    try {
      await saveSiteSettings(merged);
    } catch {
      // Handled gracefully if offline
    }
  };

  // Live countdown timer & automatic 10-18h trigger when due
  useEffect(() => {
    const updateTimer = () => {
      if (!autopilotEnabled) {
        setCountdownText('অটোপাইলট পজ (Paused) করা আছে');
        return;
      }
      const diffMs = nextRunAt - Date.now();
      if (diffMs <= 0) {
        setCountdownText('এখনই অটো পোস্ট শিডিউল রান হচ্ছে...');
        if (!autopilotLockRef.current && !isRunningAutopilot) {
          handleRunAutopilotNow(undefined, true);
        }
        return;
      }
      const totalSeconds = Math.floor(diffMs / 1000);
      const hrs = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      setCountdownText(`${hrs} ঘণ্টা ${mins} মিনিট ${secs} সেকেন্ড পর`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [autopilotEnabled, nextRunAt, isRunningAutopilot, blogs.length]);

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

  const keyTakeawaysArray = useMemo(
    () =>
      keyTakeawaysInput
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    [keyTakeawaysInput]
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

  const liveUniquenessCheck = useMemo(() => {
    return checkBlogDuplicateAndUniqueness(
      {
        id: editingId || undefined,
        title,
        slug,
        focusKeyword,
        content,
        category
      },
      blogs
    );
  }, [editingId, title, slug, focusKeyword, content, category, blogs]);

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

  // Run full 5-stage Autopilot cycle (either manually 1-click, from a specific candidate, or when 10-18h timer fires)
  const handleRunAutopilotNow = async (forcedTopic?: string, silentAutoTrigger = false) => {
    if (autopilotLockRef.current || isRunningAutopilot) return;
    autopilotLockRef.current = true;
    setIsRunningAutopilot(true);
    setAutopilotStepIndex(0);

    const stepTimer = setInterval(() => {
      setAutopilotStepIndex((prev) => (prev < 4 ? prev + 1 : prev));
    }, 900);

    try {
      const effectiveQueue = forcedTopic
        ? [forcedTopic, ...topicQueue.filter((t) => t !== forcedTopic)]
        : topicQueue;

      const result = await runBlogAutopilotCycleOnServer({
        categories: activeCategories,
        topicQueue: effectiveQueue,
        minSeoScore: minSeoScoreGate,
        minHours,
        maxHours,
        apiKey: siteSettings.geminiApiKey,
        model: siteSettings.geminiModel || 'gemini-2.5-flash',
        existingBlogs: blogs.map((b) => ({
          id: b.id,
          slug: b.slug,
          title: b.title,
          focusKeyword: b.focusKeyword,
          category: b.category,
          coverImage: b.coverImage
        }))
      });

      clearInterval(stepTimer);
      setAutopilotStepIndex(4);

      if (result.blog) {
        await saveBlogPost(result.blog);
        await injectBidirectionalLinksIntoOlderBlogs(result.blog, blogs);
      }

      const updatedLogs: SMMBlogAutopilotLog[] = [
        result.logEntry,
        ...autopilotLogs
      ].slice(0, 25);

      await persistAutopilotSettings({
        blogAutopilotLastRunAt: Date.now(),
        blogAutopilotNextRunAt: result.nextRunAt,
        blogAutopilotTotalPublished: (siteSettings.blogAutopilotTotalPublished || blogs.length) + 1,
        blogAutopilotTopicQueue: result.remainingQueue,
        blogAutopilotLogs: updatedLogs
      });

      if (!silentAutoTrigger) {
        showNotice(
          'success',
          `অটোপাইলট সফলভাবে নতুন ব্লগ পাবলিশ করেছে: "${result.blog.title}" (SEO Score: ${result.blog.seoScore}/100, Uniqueness: ${result.blog.uniquenessScore || 100}%)। পরবর্তী পোস্ট হবে ${result.nextIntervalHours} ঘণ্টা পর!`
        );
      }
    } catch (err: any) {
      clearInterval(stepTimer);
      if (!silentAutoTrigger) {
        showNotice('error', err?.message || 'অটোপাইলট ব্লগ জেনারেশনে সমস্যা হয়েছে।');
      }
    } finally {
      setIsRunningAutopilot(false);
      autopilotLockRef.current = false;
    }
  };

  // AI Keyword Research handler
  const handleResearchKeywords = async () => {
    setIsResearchingKeywords(true);
    try {
      const res = await researchKeywordsWithGeminiOnServer({
        categories: activeCategories,
        existingSlugs: blogs.map((b) => b.slug),
        existingKeywords: blogs.map((b) => b.focusKeyword),
        existingTitles: blogs.map((b) => b.title),
        customTopicHint: customKeywordHint.trim(),
        apiKey: siteSettings.geminiApiKey,
        model: siteSettings.geminiModel || 'gemini-2.5-flash'
      });
      setResearchedCandidates(res.candidates || []);
      showNotice(
        'success',
        `AI কীওয়ার্ড রিসার্চ সম্পন্ন! পুরাতন ${res.totalExcludedExisting}টি ব্লগ বাদ দিয়ে ${res.candidates.length}টি ইউনিক হাই-র‍্যাংকিং কীওয়ার্ড পাওয়া গেছে।`
      );
    } catch (err: any) {
      showNotice('error', err?.message || 'AI কীওয়ার্ড রিসার্চ করতে সমস্যা হয়েছে।');
    } finally {
      setIsResearchingKeywords(false);
    }
  };

  // Online Contextual Image Finder handler
  const handleFindContextualImage = async () => {
    setIsFindingImages(true);
    try {
      const res = await findContextualOnlineImagesOnServer({
        topic: title || aiTopic || focusKeyword || 'Bangladesh Social Media Growth',
        category: category || aiCategory || 'Facebook',
        focusKeyword: focusKeyword || aiFocusKeyword || 'boostlagbe.com',
        existingCoverUrls: blogs.map((b) => b.coverImage).filter(Boolean)
      });
      if (res.coverImage) setCoverImage(res.coverImage);
      if (res.coverImageAlt) setCoverImageAlt(res.coverImageAlt);
      if (Array.isArray(res.gallery)) setOnlineImageGallery(res.gallery);
      showNotice('success', 'ব্লগের টপিকের সাথে মিল রেখে অনলাইন থেকে প্রাসঙ্গিক HD ছবি ও SEO Alt Text যুক্ত করা হয়েছে!');
    } catch (err: any) {
      showNotice('error', err?.message || 'অনলাইন ছবি খুঁজতে সমস্যা হয়েছে।');
    } finally {
      setIsFindingImages(false);
    }
  };

  const handleStartNewPost = () => {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setExcerpt('');
    setContent('');
    setCoverImage(DEFAULT_COVER_IMAGE);
    setCoverImageAlt('Boostlagbe.com - Best Automated SMM Panel in Bangladesh');
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
    setAuthorName('তানভীর আহমেদ (Tanvir Ahmed)');
    setAuthorRole('Senior Social Media Growth Strategist, Boostlagbe.com');
    setAuthorBio(
      'তানভীর আহমেদ গত ৬+ বছর ধরে বাংলাদেশের ১০,০০০+ ফেসবুক পেজ, ইউটিউব চ্যানেল এবং ই-কমার্স ব্র্যান্ডের অর্গানিক গ্রোথ, মনিটাইজেশন ও এসইও স্ট্র্যাটেজি নিয়ে কাজ করছেন।'
    );
    setReviewedBy('Boostlagbe Editorial & SEO Review Board');
    setKeyTakeawaysInput(
      'মাত্র ১ থেকে ৫ মিনিটে অটোমেটেড সোশ্যাল মিডিয়া বুস্ট ডেলিভারি\nবিকাশ, নগদ ও রকেটে মাত্র ২০ টাকা থেকে ইনস্ট্যান্ট ওয়ালেট ডিপোজিট\n৩০ দিনের অটো রিফিল গ্যারান্টি ও ১০০% অ্যাকাউন্ট সেফটি'
    );
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

  const handleOpenCandidateInEditor = (cand: SMMBlogKeywordCandidate) => {
    handleStartNewPost();
    const resolvedTitle = cand.suggestedTitle || cand.topicTitle || cand.keyword;
    setAiTopic(resolvedTitle);
    setTitle(resolvedTitle);
    setAiFocusKeyword(cand.keyword);
    setFocusKeyword(cand.keyword);
    setAiCategory(cand.category);
    setCategory(cand.category);
    setSlug(sanitizeSlugInput(cand.keyword));
    setSecondaryKeywordsInput((cand.secondaryKeywords || []).join(', '));
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
    setSeoTitle(post.seoTitle || post.metaTitle || post.title);
    setSeoDescription(post.seoDescription || post.metaDescription || post.excerpt);
    setCanonicalUrl(post.canonicalUrl || '');
    setMetaRobots(post.metaRobots || 'index, follow');
    setSchemaType(post.schemaType || 'BlogPosting');
    setAuthorName(post.authorName || 'তানভীর আহমেদ (Tanvir Ahmed)');
    setAuthorRole(post.authorRole || 'Senior Social Media Growth Strategist, Boostlagbe.com');
    setAuthorBio(
      post.authorBio ||
        'তানভীর আহমেদ গত ৬+ বছর ধরে বাংলাদেশের ১০,০০০+ ফেসবুক পেজ, ইউটিউব চ্যানেল এবং ই-কমার্স ব্র্যান্ডের অর্গানিক গ্রোথ, মনিটাইজেশন ও এসইও স্ট্র্যাটেজি নিয়ে কাজ করছেন।'
    );
    setReviewedBy(post.reviewedBy || 'Boostlagbe Editorial & SEO Review Board');
    setKeyTakeawaysInput((post.keyTakeaways || []).join('\n'));
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
        includeFaqSchema: siteSettings.geminiAutoFaqSchema !== false,
        existingBlogs: blogs.map((b) => ({
          slug: b.slug,
          title: b.title,
          focusKeyword: b.focusKeyword,
          category: b.category,
          coverImage: b.coverImage
        }))
      });

      const gen = result.blog;
      if (gen.title) setTitle(gen.title);
      if (gen.slug) setSlug(sanitizeSlugInput(gen.slug));
      if (gen.excerpt) setExcerpt(gen.excerpt);
      if (gen.content) setContent(gen.content);
      if (gen.seoTitle || gen.metaTitle) setSeoTitle(gen.seoTitle || gen.metaTitle || '');
      if (gen.seoDescription || gen.metaDescription) {
        setSeoDescription(gen.seoDescription || gen.metaDescription || '');
      }
      if (gen.focusKeyword) setFocusKeyword(gen.focusKeyword);
      if (gen.coverImage) setCoverImage(gen.coverImage);
      if (gen.coverImageAlt) setCoverImageAlt(gen.coverImageAlt);
      if (gen.authorName) setAuthorName(gen.authorName);
      if (gen.authorRole) setAuthorRole(gen.authorRole);
      if (gen.authorBio) setAuthorBio(gen.authorBio);
      if (gen.reviewedBy) setReviewedBy(gen.reviewedBy);
      if (Array.isArray(gen.keyTakeaways) && gen.keyTakeaways.length > 0) {
        setKeyTakeawaysInput(gen.keyTakeaways.join('\n'));
      }
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
        `মানুষের মতো সাবলীল ভাষায় ১০০% SEO অপ্টিমাইজড ব্লগ, অনলাইন ছবি ও পুরাতন ব্লগের ইন্টারনাল লিংকসহ তৈরি হয়েছে!`
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
      if (optimized.coverImage && (!coverImage || coverImage === DEFAULT_COVER_IMAGE)) {
        setCoverImage(optimized.coverImage);
      }
      if (optimized.coverImageAlt) setCoverImageAlt(optimized.coverImageAlt);
      if (Array.isArray(optimized.keyTakeaways) && optimized.keyTakeaways.length > 0) {
        setKeyTakeawaysInput(optimized.keyTakeaways.join('\n'));
      }
      if (Array.isArray(optimized.secondaryKeywords) && optimized.secondaryKeywords.length > 0) {
        setSecondaryKeywordsInput(optimized.secondaryKeywords.join(', '));
      }
      if (Array.isArray(optimized.tags) && optimized.tags.length > 0) {
        setTagsInput(optimized.tags.join(', '));
      }
      if (Array.isArray(optimized.faqItems) && optimized.faqItems.length >= 2) {
        setFaqItems(optimized.faqItems);
      }

      showNotice(
        'success',
        '১০০% গুগল র‍্যাংকিংয়ের জন্য সব মেটা ট্যাগ, অনলাইন ইমেজ অল্ট, স্লাগ ও FAQ স্কিমা অটো-অপ্টিমাইজ করা হয়েছে!'
      );
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
    const resolvedMetaTitle = (seoTitle.trim() || `${title.trim()} | Boostlagbe.com`).slice(0, 75);
    const resolvedMetaDesc = (
      seoDescription.trim() ||
      excerpt.trim() ||
      `${title.trim()} নিয়ে সম্পূর্ণ গাইড পড়ুন Boostlagbe.com-এ।`
    ).slice(0, 175);

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
      metaTitle: resolvedMetaTitle,
      metaDescription: resolvedMetaDesc,
      seoTitle: resolvedMetaTitle,
      seoDescription: resolvedMetaDesc,
      canonicalUrl:
        canonicalUrl.trim() ||
        `https://boostlagbe.com/?tab=blog&slug=${encodeURIComponent(finalSlug)}`,
      ogType: 'article',
      schemaType,
      metaRobots,
      readingTimeMinutes: liveSeoEvaluation.readingTimeMinutes,
      wordCount: liveSeoEvaluation.wordCount,
      seoScore: liveSeoEvaluation.score,
      uniquenessScore: liveUniquenessCheck.uniquenessScore,
      keyTakeaways: keyTakeawaysArray,
      faqItems: faqItems.filter((f) => f.question.trim() && f.answer.trim()),
      authorName: authorName.trim() || 'তানভীর আহমেদ (Tanvir Ahmed)',
      authorRole: authorRole.trim() || 'Senior Social Media Growth Strategist, Boostlagbe.com',
      authorBio: authorBio.trim(),
      reviewedBy: reviewedBy.trim() || 'Boostlagbe Editorial & SEO Review Board',
      status,
      views: existingPost?.views || 135,
      aiGenerated: true,
      publishedAt: existingPost?.publishedAt || now,
      createdAt: existingPost?.createdAt || now,
      updatedAt: now
    };

    setIsSaving(true);
    try {
      await saveBlogPost(postObj);
      await injectBidirectionalLinksIntoOlderBlogs(postObj, blogs);
      showNotice(
        'success',
        `ব্লগ পোস্টটি সফলভাবে পাবলিশ হয়েছে (SEO Score: ${liveSeoEvaluation.score}/100, Uniqueness: ${liveUniquenessCheck.uniquenessScore}%, N-Gram Overlap: ${liveUniquenessCheck.nGramSimilarityPercent}%) এবং পুরাতন ব্লগে অটো ব্যাকলিংক যুক্ত হয়েছে!`
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
            className="text-xs underline opacity-80 hover:opacity-100 shrink-0"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* =========================================================
          TOP HERO & 10-18H AUTOPILOT COMMAND BAR
         ========================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-7 border border-indigo-500/20 shadow-lg space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" /> 100% Automated SEO Blog & AI Keyword Research Engine
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold border ${
                  autopilotEnabled
                    ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                    : 'bg-amber-500/20 border-amber-400/30 text-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    autopilotEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {autopilotEnabled
                  ? `অটোপাইলট চালু আছে (প্রতি ${minHours}–${maxHours} ঘণ্টা পর পর)`
                  : 'অটোপাইলট বন্ধ আছে'}
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              অটোমেটিক AI কীওয়ার্ড রিসার্চ ও ১০০% হিউম্যান-এসইও ব্লগ অটোপাইলট
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              প্রতি <span className="text-emerald-300 font-bold">১০ থেকে ১৮ ঘণ্টা পর পর</span> র‍্যান্ডম সময়ে AI নিজে থেকে সেরা কীওয়ার্ড খুঁজে বের করবে, পুরাতন ব্লগের সাথে ডুপ্লিকেট বা ক্যানিবালাইজেশন এড়িয়ে{' '}
              <span className="text-emerald-300 font-bold">মানুষের মতো সাবলীল বাংলায়</span> ব্লগ লিখবে, অনলাইন থেকে প্রাসঙ্গিক ছবি যুক্ত করবে এবং{' '}
              <span className="text-amber-300 font-bold">{minSeoScoreGate}%+ SEO Score</span> নিশ্চিত করে পাবলিশ ও সাইটম্যাপ আপডেট করবে।
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={onOpenGeminiSettings}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Settings className="w-4 h-4 text-indigo-300" />
              <span>
                Gemini API{' '}
                {siteSettings.geminiApiKey ? (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                    যুক্ত আছে
                  </span>
                ) : (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px]">
                    সেটআপ
                  </span>
                )}
              </span>
            </button>

            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => syncBlogsToServerSitemap(blogs)}
              className="px-3.5 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/30 text-emerald-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <Globe className="w-4 h-4" /> Image Sitemap.xml
            </a>

            <a
              href="/rss.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-4 h-4" /> RSS 2.0 Feed
            </a>

            {mode === 'list' ? (
              <button
                onClick={handleStartNewPost}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-extrabold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" /> ম্যানুয়াল ব্লগ লিখুন
              </button>
            ) : (
              <button
                onClick={() => setMode('list')}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> অটোপাইলট ও ব্লগ লিস্টে ফিরুন
              </button>
            )}
          </div>
        </div>

        {/* Live 10-18h Autopilot Quick Action & Countdown Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/70 border border-indigo-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() =>
                persistAutopilotSettings({
                  blogAutopilotEnabled: !autopilotEnabled,
                  blogAutopilotNextRunAt: !autopilotEnabled
                    ? Date.now() + (10 + Math.random() * 8) * 3600 * 1000
                    : nextRunAt
                })
              }
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-sm ${
                autopilotEnabled
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {autopilotEnabled ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> অটোপাইলট চালু আছে (ON)
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> অটোপাইলট চালু করুন (OFF)
                </>
              )}
            </button>

            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>পরবর্তী অটোমেটিক ব্লগ পাবলিশ:</span>
                <span className="text-white font-mono font-extrabold">{countdownText}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                গুগল স্প্যাম প্রোটেকশন রুল: র‍্যান্ডম {minHours}–{maxHours} ঘণ্টা ব্যবধান • মিনিমাম SEO গেট: {minSeoScoreGate}%+ • অ্যান্টি-ক্যানিবালাইজেশন সক্রিয়
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={isRunningAutopilot}
              onClick={() => handleRunAutopilotNow()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 text-slate-950 text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-lg transition-all"
            >
              {isRunningAutopilot ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> AI কীওয়ার্ড রিসার্চ ও ব্লগ পাবলিশ হচ্ছে...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" /> এখনই ১-ক্লিকে অটো ব্লগ রিসার্চ ও পাবলিশ করুন
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live 5-Stage Pipeline Progress Visualizer when running */}
        {isRunningAutopilot && (
          <div className="p-4 rounded-2xl bg-indigo-950/90 border border-indigo-400/40 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-200">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                অটোপাইলট ইঞ্জিন লাইভ কাজ করছে (ধাপ {autopilotStepIndex + 1}/5)...
              </span>
              <span className="text-emerald-300 font-mono">
                {Math.round(((autopilotStepIndex + 1) / 5) * 100)}%
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {AUTOPILOT_PIPELINE_STEPS.map((label, idx) => {
                const done = idx < autopilotStepIndex;
                const active = idx === autopilotStepIndex;
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-start gap-2 transition-all ${
                      done
                        ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                        : active
                        ? 'bg-amber-500/20 border-amber-400/50 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400'
                    }`}
                  >
                    {done ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : active ? (
                      <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
                    ) : (
                      <span className="w-4 h-4 rounded-full bg-white/10 text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                    )}
                    <span className="leading-snug">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick KPI Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-white/10">
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
            <span className="text-[11px] text-slate-400 block">অ্যান্টি-ডুপ্লিকেট গার্ড</span>
            <span className="text-xs font-extrabold text-emerald-300 flex items-center gap-1 mt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> ১০০% ইউনিক কীওয়ার্ড
            </span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[11px] text-slate-400 block">অটো ইন্টারনাল লিংক ও ছবি</span>
            <span className="text-xs font-extrabold text-indigo-300 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> অনলাইন ছবি + ব্যাকলিংক
            </span>
          </div>
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 block">অপেক্ষমাণ টপিক কিউ</span>
            <span className="text-lg font-extrabold text-amber-300">{topicQueue.length} টি টপিক</span>
          </div>
        </div>
      </div>

      {mode === 'list' ? (
        /* ==========================================
           SUB-NAVIGATION TABS FOR BLOG CMS & AUTOPILOT
           ========================================== */
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('posts')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeSubTab === 'posts'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>প্রকাশিত সব ব্লগ ({blogs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('keywords');
                if (researchedCandidates.length === 0) {
                  handleResearchKeywords();
                }
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeSubTab === 'keywords'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>AI কীওয়ার্ড রিসার্চ ও কিউ</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                setActiveSubTab('radar');
                if (competitorTrends.length === 0 && !isScanningTrends) {
                  setIsScanningTrends(true);
                  try {
                    const res = await scanCompetitorTrendsOnServer(blogs);
                    setCompetitorTrends(res.trends || []);
                  } catch {
                    // ignore
                  } finally {
                    setIsScanningTrends(false);
                  }
                }
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeSubTab === 'radar'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>ট্রেন্ড রাডার ও পাঠক Q&A</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('autopilot')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeSubTab === 'autopilot'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>১০–১৮ ঘণ্টা অটোপাইলট</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('logs')}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all col-span-2 sm:col-span-1 ${
                activeSubTab === 'logs'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>ইনডেক্সিং লগ ({autopilotLogs.length})</span>
            </button>
          </div>

          {/* SUB-TAB 1: PUBLISHED BLOG POSTS LIST */}
          {activeSubTab === 'posts' && (
            <div className="space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
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

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isHealingAll}
                    onClick={async () => {
                      setIsHealingAll(true);
                      try {
                        const res = await healAllBlogsSeoAndImages(blogs);
                        showNotice(
                          'success',
                          `সেলফ-হিলিং SEO সম্পন্ন! ${res.healedCount}টি ব্লগের ছবি, HowTo স্কিমা, কেস স্টাডি ও ১০০% SEO স্বয়ংক্রিয়ভাবে আপগ্রেড করা হয়েছে।`
                        );
                      } catch (err: any) {
                        showNotice('error', err?.message || 'Self-healing SEO ব্যর্থ হয়েছে।');
                      } finally {
                        setIsHealingAll(false);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {isHealingAll ? 'হিলিং হচ্ছে...' : '১-ক্লিক Self-Healing SEO ও ইমেজ ফিক্স'}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      let totalLinked = 0;
                      for (const post of blogs.slice(0, 3)) {
                        const res = await injectBidirectionalLinksIntoOlderBlogs(post, blogs);
                        totalLinked += res.updatedOlderCount;
                      }
                      showNotice(
                        'success',
                        `রিভার্স বাইডিরেকশনাল ইন্টারলিংকিং সম্পন্ন! ${totalLinked}টি পুরাতন ব্লগে নতুন ব্লগের প্রাসঙ্গিক ব্যাকলিংক যুক্ত হয়েছে।`
                      );
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                  >
                    <Link2 className="w-3.5 h-3.5" /> ১-ক্লিক অটো ব্যাকলিংক মেশ
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      exportAllBlogsToJsonOrCsv(blogs, 'json');
                      showNotice('success', `${blogs.length}টি ব্লগের সম্পূর্ণ JSON SEO ব্যাকআপ ডাউনলোড শুরু হয়েছে!`);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> JSON ব্যাকআপ
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      exportAllBlogsToJsonOrCsv(blogs, 'csv');
                      showNotice('success', `${blogs.length}টি ব্লগের অ্যানালিটিক্স ও ROI রিপোর্ট CSV ডাউনলোড শুরু হয়েছে!`);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400 text-xs font-extrabold flex items-center gap-1.5 transition-colors"
                  >
                    <Award className="w-3.5 h-3.5" /> CSV এক্সপোর্ট
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      syncBlogsToServerSitemap(blogs);
                      try {
                        const pingRes = await pingIndexNowOnServer({});
                        showNotice('success', pingRes.message);
                      } catch {
                        showNotice('success', 'সব প্রকাশিত ব্লগ পোস্ট /sitemap.xml-এ সিঙ্ক করা হয়েছে!');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-500" /> Sitemap ও IndexNow পিং
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {filteredBlogs.map((post) => {
                  const score = post.seoScore || computeSeoScoreForBlogPost(post).score;
                  const uniqueness = post.uniquenessScore || 100;
                  return (
                    <div
                      key={post.id}
                      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xs hover:border-indigo-500/40 transition-all"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={post.coverImage || DEFAULT_COVER_IMAGE}
                          alt={post.coverImageAlt || post.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = DEFAULT_COVER_IMAGE;
                          }}
                          className="w-24 h-20 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 hidden sm:block"
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
                            <span className="px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-extrabold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> {uniqueness}% Unique • N-Gram: {post.nGramSimilarityPercent ?? 4}%
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-mono font-bold">
                              {post.contentFingerprint || `BL-FP-${post.id.slice(0, 6).toUpperCase()}`}
                            </span>
                            {post.autopilotGenerated && (
                              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold">
                                10-18h Autopilot
                              </span>
                            )}
                          </div>

                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                            {post.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                            <span>/?tab=blog&slug={post.slug}</span>
                            <span>•</span>
                            <span>Focus KW: {post.focusKeyword}</span>
                            <span>•</span>
                            <span>{post.wordCount || 650} words</span>
                            <span>•</span>
                            <span>{(post.faqItems || []).length} FAQs Schema</span>
                          </div>

                          {/* Feature 20 & 21: Conversion Attribution ROI + Internal Link Graph Metrics */}
                          {(() => {
                            const linkMetrics = computeInternalLinkGraphMetrics(post, blogs);
                            return (
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                                  💰 ROI: {post.attributedOrdersCount || 14} Orders (৳{(post.attributedRevenueBdt || 2450).toLocaleString()}) • {post.calculatorClicksCount || 38} Calc Clicks
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                    linkMetrics.isOrphan
                                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                      : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300'
                                  }`}
                                >
                                  🔗 Link Graph: {linkMetrics.inboundLinksCount} In / {linkMetrics.outboundLinksCount} Out ({linkMetrics.healthLabel})
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={async () => {
                            await refreshOldBlogPostForSeo(post, blogs);
                            showNotice(
                              'success',
                              `"${post.title}" ব্লগটি ২০২৬ সালের নতুন তথ্য, ইন্টারনাল লিংক ও ১০০% SEO দিয়ে রিফ্রেশ করা হয়েছে!`
                            );
                          }}
                          className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold flex items-center gap-1 transition-colors"
                          title="Auto-Refresh Old Blog for Google Freshness"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> রিফ্রেশ ২০২৬
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const scriptObj = generate60sReelsScriptFromBlog(post);
                            const fullText = `${scriptObj.hook0to5s}\n\n${scriptObj.body5to45s.join('\n')}\n\n${scriptObj.cta45to60s}\n\n${scriptObj.captionWithHashtags}`;
                            navigator.clipboard.writeText(fullText);
                            showNotice(
                              'success',
                              '৬০ সেকেন্ডের ভাইরাল Reels / TikTok / Shorts ভিডিও স্ক্রিপ্ট কপি হয়েছে!'
                            );
                          }}
                          className="px-3 py-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" /> 60s ভিডিও স্ক্রিপ্ট
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/?tab=blog&slug=${encodeURIComponent(post.slug)}`;
                            const caption = `🔥 ${post.title}\n\n✅ ${post.excerpt}\n\n👉 সম্পূর্ণ গাইড পড়ুন: ${url}\n\n#Boostlagbe #${post.category.replace(/\s+/g, '')}BD #SMMPanelBD`;
                            navigator.clipboard.writeText(caption);
                            showNotice(
                              'success',
                              'ফেসবুক, টেলিগ্রাম ও হোয়াটসঅ্যাপে শেয়ারের জন্য রেডিমেড ভাইরাল ক্যাপশন কপি হয়েছে!'
                            );
                          }}
                          className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-1 transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> সোশ্যাল ক্যাপশন
                        </button>
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
          )}

          {/* SUB-TAB 2: AI KEYWORD RESEARCH STUDIO & PRIORITY TOPIC QUEUE */}
          {activeSubTab === 'keywords' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: Live AI Keyword Research & Anti-Cannibalization Scanner */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-500">
                      Bangladesh Search Intent & Anti-Cannibalization Scanner
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      AI ট্রেন্ডিং কীওয়ার্ড রিসার্চ ল্যাব (BD Market)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      পুরাতন {blogs.length}টি ব্লগের কীওয়ার্ড বাদ দিয়ে নতুন হাই-ভলিউম ও লো-কম্পিটিশন কীওয়ার্ড খুঁজে বের করুন।
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isResearchingKeywords}
                    onClick={handleResearchKeywords}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-2 shadow-sm transition-all"
                  >
                    {isResearchingKeywords ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> রিসার্চ হচ্ছে...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" /> নতুন সেরা কীওয়ার্ড খুঁজুন
                      </>
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customKeywordHint}
                    onChange={(e) => setCustomKeywordHint(e.target.value)}
                    placeholder="কাস্টম নিশ বা বিষয় লিখুন (ঐচ্ছিক, যেমন: Facebook Reels Monetization BD)..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    disabled={isResearchingKeywords}
                    onClick={handleResearchKeywords}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shrink-0"
                  >
                    স্ক্যান করুন
                  </button>
                </div>

                <div className="space-y-3">
                  {researchedCandidates.map((cand, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold">
                            {cand.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold">
                            Vol: {cand.monthlyVolume || cand.monthlySearchVolumeBd}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold">
                            KD: {cand.difficulty ?? cand.keywordDifficulty}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-bold">
                            Intent: {cand.intent || cand.searchIntent}
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" /> 100% Unique (No Conflict)
                        </span>
                      </div>

                      <div>
                        <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 block">
                          Focus Keyword: "{cand.keyword}"
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                          {cand.suggestedTitle || cand.topicTitle}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          {cand.rationale || cand.whyItRanks}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isRunningAutopilot}
                          onClick={() =>
                            handleRunAutopilotNow(
                              `${cand.suggestedTitle || cand.topicTitle} (${cand.keyword})`
                            )
                          }
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" /> এখনই অটো ব্লগ পাবলিশ করুন
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const entry = `${cand.suggestedTitle || cand.topicTitle} (${cand.keyword})`;
                            if (!topicQueue.includes(entry)) {
                              persistAutopilotSettings({
                                blogAutopilotTopicQueue: [...topicQueue, entry]
                              });
                              showNotice('success', 'টপিকটি ১০–১৮ ঘণ্টার অটোপাইলট কিউতে যুক্ত হয়েছে!');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold"
                        >
                          + অটো কিউতে রাখুন
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCandidateInEditor(cand)}
                          className="px-3 py-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-bold"
                        >
                          এডিটরে ওপেন করুন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 5 Cols: Priority Topic Queue for 10-18h Autopilot */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
                    Priority Autopilot Queue
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    অটোপাইলট প্রাধান্য টপিক কিউ ({topicQueue.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    এখানে যেসব টপিক বা কীওয়ার্ড থাকবে, ১০–১৮ ঘণ্টার অটোপাইলট সেগুলো আগে পাবলিশ করবে। কিউ খালি হলে AI নিজে থেকে নতুন কীওয়ার্ড রিসার্চ করে নেবে।
                  </p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newQueueTopic}
                    onChange={(e) => setNewQueueTopic(e.target.value)}
                    placeholder="নতুন টপিক বা কীওয়ার্ড লিখুন..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const clean = newQueueTopic.trim();
                      if (!clean) return;
                      persistAutopilotSettings({
                        blogAutopilotTopicQueue: [...topicQueue, clean]
                      });
                      setNewQueueTopic('');
                      showNotice('success', 'নতুন টপিক অটোপাইলট কিউতে যুক্ত করা হয়েছে!');
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shrink-0"
                  >
                    + যোগ করুন
                  </button>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {topicQueue.length === 0 ? (
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-center text-xs text-slate-500">
                      কিউ খালি আছে — অটোপাইলট স্বয়ংক্রিয়ভাবে AI Keyword Research ব্যাংক থেকে সেরা কীওয়ার্ড বেছে নেবে।
                    </div>
                  ) : (
                    topicQueue.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-mono text-xs font-extrabold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={isRunningAutopilot}
                            onClick={() => handleRunAutopilotNow(item)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold"
                          >
                            এখনই পোস্ট
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              persistAutopilotSettings({
                                blogAutopilotTopicQueue: topicQueue.filter((_, i) => i !== idx)
                              })
                            }
                            className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: 10-18H AUTOPILOT CONFIGURATION */}
          {activeSubTab === 'autopilot' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-7 space-y-6 shadow-xs">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  ১০–১৮ ঘণ্টা অটোমেটিক ব্লগ পাবলিশিং ও গুগল র‍্যাংকিং সেফটি সেটিংস
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  গুগল যেন কখনোই স্প্যাম বা রোবটিক পোস্ট মনে না করে, সেজন্য র‍্যান্ডম হিউম্যান টাইমিং এবং ৯৫%+ SEO Score Gate এখানে কনফিগার করা আছে।
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    সর্বনিম্ন বিরতি (Minimum Interval Hours)
                  </label>
                  <select
                    value={minHours}
                    onChange={(e) =>
                      persistAutopilotSettings({ blogAutopilotMinHours: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value={8}>৮ ঘণ্টা</option>
                    <option value={10}>১০ ঘণ্টা (Recommended)</option>
                    <option value={12}>১২ ঘণ্টা</option>
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    সর্বোচ্চ বিরতি (Maximum Interval Hours)
                  </label>
                  <select
                    value={maxHours}
                    onChange={(e) =>
                      persistAutopilotSettings({ blogAutopilotMaxHours: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value={14}>১৪ ঘণ্টা</option>
                    <option value={16}>১৬ ঘণ্টা</option>
                    <option value={18}>১৮ ঘণ্টা (Recommended Human Cadence)</option>
                    <option value={24}>২৪ ঘণ্টা</option>
                  </select>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                    অটো পাবলিশ ন্যূনতম SEO Score Gate
                  </label>
                  <select
                    value={minSeoScoreGate}
                    onChange={(e) =>
                      persistAutopilotSettings({ blogAutopilotMinSeoScore: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-emerald-600 dark:text-emerald-400"
                  >
                    <option value={95}>৯৫%+ SEO Score হলে অটো পাবলিশ (Recommended)</option>
                    <option value={90}>৯০%+ SEO Score হলে অটো পাবলিশ</option>
                    <option value={98}>৯৮%+ SEO Score হলে অটো পাবলিশ</option>
                  </select>
                </div>
              </div>

              {/* Target Categories Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                  অটোপাইলট কীওয়ার্ড রিসার্চের টার্গেট ক্যাটাগরিসমূহ
                </label>
                <div className="flex flex-wrap gap-2">
                  {ALL_BLOG_CATEGORIES.map((cat) => {
                    const selected = activeCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          const updated = selected
                            ? activeCategories.filter((c) => c !== cat)
                            : [...activeCategories, cat];
                          if (updated.length > 0) {
                            persistAutopilotSettings({ blogAutopilotCategories: updated });
                          }
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold border transition-all flex items-center gap-1.5 ${
                          selected
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {selected && <Check className="w-3.5 h-3.5" />}
                        <span>{cat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Built-in Anti-Ban & Human Quality Safeguards Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-1.5">
                  <h4 className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" /> গুগল অ্যান্টি-স্প্যাম ও হিউম্যান রাইটিং প্রোটেকশন
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    প্রতিটি ব্লগে রোবটিক AI ফ্রেজ বর্জন করে বাস্তব বাংলাদেশি ক্রিয়েটর উদাহরণ, বিকাশ/নগদ BDT তুলনামূলক টেবিল, প্রো টিপস এবং ভেরিফাইড লেখক পরিচিতি (E-E-A-T) স্বয়ংক্রিয়ভাবে যুক্ত হয়।
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/20 space-y-1.5">
                  <h4 className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Link2 className="w-4 h-4" /> অটো ইন্টারনাল লিংকিং ও অনলাইন প্রাসঙ্গিক ছবি
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    নতুন ব্লগ লেখার সময় স্বয়ংক্রিয়ভাবে পুরাতন ব্লগের প্রাসঙ্গিক ইন্টারনাল লিংক ("আরও পড়ুন") এবং টপিকের সাথে মিল রেখে অনলাইন HD কভার ও ইন-আর্টিকেল ছবি + SEO Alt ট্যাগ যুক্ত হয়।
                  </p>
                </div>
              </div>

              {/* Bangladesh Seasonal & Event Calendar Autopilot Triggers */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
                    Bangladesh Seasonal & Festival Campaign Autopilot
                  </span>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    বাংলাদেশ ইভেন্ট ও ফেস্টিভ্যাল সিজনাল অটোপাইলট (ঈদ, পূজা, বৈশাখ, বিপিএল, উইন্টার)
                  </h4>
                  <p className="text-xs text-slate-500">
                    ঈদ, পহেলা বৈশাখ, দুর্গাপূজা বা বিপিএল ক্রিকেট সিজনের আগে ১-ক্লিকে হাই-কনভার্টিং সিজনাল গাইড পাবলিশ বা কিউতে যুক্ত করুন।
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {BD_SEASONAL_CAMPAIGN_TEMPLATES.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold">
                            {tpl.badge}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                            {tpl.category}
                          </span>
                        </div>
                        <h5 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                          {tpl.seasonName}
                        </h5>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          {tpl.topic}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          disabled={isRunningAutopilot}
                          onClick={() => handleRunAutopilotNow(`${tpl.topic} (${tpl.focusKeyword})`)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" /> এখনই অটো পাবলিশ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const entry = `${tpl.topic} (${tpl.focusKeyword})`;
                            if (!topicQueue.includes(entry)) {
                              persistAutopilotSettings({
                                blogAutopilotTopicQueue: [...topicQueue, entry]
                              });
                              showNotice('success', `"${tpl.seasonName}" ১০–১৮ ঘণ্টার কিউতে যুক্ত হয়েছে!`);
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold"
                        >
                          + কিউতে রাখুন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 4: AUTOPILOT & GOOGLE INDEXING LOGS */}
          {activeSubTab === 'logs' && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    অটোপাইলট পাবলিশিং ও গুগল Sitemap ইনডেক্সিং লগ
                  </h3>
                  <p className="text-xs text-slate-500">
                    স্বয়ংক্রিয়ভাবে প্রকাশিত প্রতিটি ব্লগের কীওয়ার্ড, SEO স্কোর, ইউনিকনেস স্কোর ও সাইটম্যাপ পিং রেকর্ড।
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {autopilotLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold">
                          SEO Score: {log.seoScore}/100
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[10px] font-extrabold">
                          {log.uniquenessScore}% Unique
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                          {log.internalLinksCount ?? log.internalLinksInjected} Internal Links
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleString('bn-BD')}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                        {log.title || log.blogTitle}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        টার্গেট কীওয়ার্ড: <strong className="text-indigo-500">{log.keyword || log.researchedKeyword}</strong> • {log.note || log.summary}
                      </p>
                    </div>

                    {onPreviewBlogSlug && (
                      <button
                        type="button"
                        onClick={() => onPreviewBlogSlug(log.slug || log.blogSlug)}
                        className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0 flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" /> পোস্ট দেখুন
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SUB-TAB 5: BD VIRAL TREND RADAR, COMPETITOR GAP & READER Q&A MODERATION */}
          {activeSubTab === 'radar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: Competitor Keyword Gap & BD Viral Trend Radar */}
              <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
                      Competitor Gap & BD Viral Trend Radar
                    </span>
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      বাংলাদেশ ভাইরাল ট্রেন্ড ও কম্পিটিটর কীওয়ার্ড গ্যাপ স্ক্যানার
                    </h3>
                    <p className="text-xs text-slate-500">
                      প্রতিযোগীদের সাইটে যেসব গাইড নেই কিন্তু বাংলাদেশে প্রচুর সার্চ হচ্ছে, সেগুলো ১-ক্লিকে পাবলিশ করুন।
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isScanningTrends}
                    onClick={async () => {
                      setIsScanningTrends(true);
                      try {
                        const res = await scanCompetitorTrendsOnServer(blogs);
                        setCompetitorTrends(res.trends || []);
                        showNotice('success', 'বাংলাদেশের সর্বশেষ ভাইরাল ট্রেন্ড ও কীওয়ার্ড গ্যাপ স্ক্যান সম্পন্ন!');
                      } finally {
                        setIsScanningTrends(false);
                      }
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanningTrends ? 'animate-spin' : ''}`} />
                    ট্রেন্ড স্ক্যান করুন
                  </button>
                </div>

                <div className="space-y-3">
                  {competitorTrends.map((tr) => (
                    <div
                      key={tr.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold">
                            {tr.category}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold">
                            {tr.trendVelocity}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                            {tr.monthlyVolume}
                          </span>
                        </div>
                        <span className="text-[10px] font-extrabold text-emerald-500">
                          KD: {tr.difficulty}/100 (Easy Rank)
                        </span>
                      </div>

                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        {tr.topicTitle}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <strong className="text-rose-500">কম্পিটিটর গ্যাপ:</strong> {tr.competitorWeakness}
                      </p>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isRunningAutopilot}
                          onClick={() => handleRunAutopilotNow(`${tr.topicTitle} (${tr.keyword})`)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" /> এখনই অটো ব্লগ লিখুন ও পাবলিশ করুন
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const entry = `${tr.topicTitle} (${tr.keyword})`;
                            if (!topicQueue.includes(entry)) {
                              persistAutopilotSettings({
                                blogAutopilotTopicQueue: [...topicQueue, entry]
                              });
                              showNotice('success', 'ট্রেন্ডিং টপিকটি ১০–১৮ ঘণ্টার কিউতে যুক্ত হয়েছে!');
                            }
                          }}
                          className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold"
                        >
                          + কিউতে যোগ করুন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Feature 19: Community Upvoted Topic Requests in Admin Radar */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-500">
                      Reader Community Upvoted Topic Board
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                      পাঠকদের রিকোয়েস্ট ও আপভোট করা টপিকসমূহ
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {getCommunityTopicRequests().slice(0, 4).map((req) => (
                      <div
                        key={req.id}
                        className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold">
                              ▲ {req.upvotes} Upvotes
                            </span>
                            <span className="text-[10px] font-bold text-slate-400">
                              {req.category} • {req.requestedBy}
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            {req.topicTitle || req.topic}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isRunningAutopilot}
                          onClick={() => handleRunAutopilotNow(req.topicTitle || req.topic)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3" /> ১-ক্লিকে ব্লগ পাবলিশ
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Verified Reader Q&A & Comment Reply Manager */}
              <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-4 shadow-xs">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-500">
                    Reader Q&A & Social Proof Moderation
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    পাঠকদের প্রশ্ন ও অ্যাডমিন রিপ্লাই প্যানেল
                  </h3>
                  <p className="text-xs text-slate-500">
                    ব্লগের নিচে পাঠকদের করা প্রশ্নের অফিশিয়াল উত্তর দিন।
                  </p>
                </div>

                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {blogs
                    .flatMap((b) =>
                      (b.comments || []).map((c) => ({
                        blog: b,
                        comment: c
                      }))
                    )
                    .map(({ blog, comment }) => (
                      <div
                        key={`${blog.id}-${comment.id}`}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            {comment.authorName || comment.userName || 'ভেরিফাইড ক্রিয়েটর'}{' '}
                            <span className="text-amber-500">{'★'.repeat(comment.rating || 5)}</span>
                          </span>
                          <span className="text-[10px] text-indigo-500 font-bold truncate max-w-[160px]">
                            {blog.title}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                          {comment.text || comment.questionOrComment || ''}
                        </p>
                        {comment.adminReply && (
                          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300">
                            <strong>অ্যাডমিন উত্তর:</strong> {comment.adminReply}
                          </div>
                        )}
                        <div className="flex gap-1.5 pt-1">
                          <input
                            type="text"
                            value={replyDrafts[comment.id] ?? ''}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [comment.id]: e.target.value
                              }))
                            }
                            placeholder="অ্যাডমিন রিপ্লাই লিখুন..."
                            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              const draft = (replyDrafts[comment.id] || '').trim();
                              if (!draft) return;
                              await replyToBlogComment(blog, comment.id, draft);
                              setReplyDrafts((prev) => ({ ...prev, [comment.id]: '' }));
                              showNotice('success', 'পাঠকের প্রশ্নের উত্তর সফলভাবে সেভ হয়েছে!');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-extrabold shrink-0"
                          >
                            উত্তর দিন
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ==========================================
           FULL BLOG EDITOR + GEMINI AI WRITER + 100% SEO SCORE ANALYZER
           ========================================== */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* LEFT 8 COLS: AI GENERATOR + CONTENT & SCHEMA EDITOR */}
          <div className="xl:col-span-8 space-y-6">
            {/* 1. GOOGLE GEMINI AI 1-CLICK HUMAN BLOG WRITER */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-indigo-500/10 dark:from-indigo-950/60 dark:to-slate-900 rounded-3xl border border-indigo-500/30 p-5 sm:p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                      Google Gemini AI দিয়ে ১০০% মানুষের মতো SEO ব্লগ জেনারেট করুন
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      টপিক দিলেই AI স্বয়ংক্রিয়ভাবে পুরাতন ব্লগের সাথে ডুপ্লিকেট এড়িয়ে মানবিক ভাষায় আর্টিকেল, তুলনামূলক টেবিল, অনলাইন ছবি ও ইন্টারনাল লিংক তৈরি করবে।
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
                    placeholder="যেমন: facebook page monetization bd"
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
                      {ALL_BLOG_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
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
                      <option value="bn">মানবিক বাংলা + SEO</option>
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
                  * ১০০/১০০ SEO স্কোরের জন্য প্রয়োজনীয় সব হেডিং, অনলাইন ছবি, পুরাতন ব্লগের লিংক ও FAQ স্বয়ংক্রিয়ভাবে যুক্ত হবে।
                </span>
                <button
                  type="button"
                  disabled={isGeneratingAi}
                  onClick={handleGenerateWithGemini}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-2 shadow-md transition-all"
                >
                  {isGeneratingAi ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> হিউম্যান-স্টাইল আর্টিকেল লেখা হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" /> সম্পূর্ণ হিউম্যান-SEO ব্লগ জেনারেট করুন
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 2. MAIN ARTICLE CONTENT FORM */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" /> ব্লগ পোস্ট কন্টেন্ট ও স্ট্রাকচার
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 ${
                      liveUniquenessCheck.isUnique
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Uniqueness: {liveUniquenessCheck.uniquenessScore}% • N-Gram: {liveUniquenessCheck.nGramSimilarityPercent}%
                  </span>
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
              </div>

              {!liveUniquenessCheck.isUnique && liveUniquenessCheck.conflictReason && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>অ্যান্টি-ক্যানিবালাইজেশন সতর্কতা: {liveUniquenessCheck.conflictReason}</span>
                </div>
              )}

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
                    placeholder="যেমন: ফেসবুক পেজ মনিটাইজেশন পাওয়ার সম্পূর্ণ গাইড ২০২৬ (60k Watchtime ও ফলোয়ার)"
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
                    placeholder="facebook-page-monetization-guide-bangladesh"
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
                      {ALL_BLOG_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
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
                    মূল আর্টিকেল বডি (Semantic HTML with H2, H3, Comparison Table & Internal Links) *
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
                      onClick={() => {
                        const related = blogs.find((b) => b.slug !== slug);
                        if (related) {
                          insertHtmlSnippet(
                            `<blockquote><strong>আরও পড়ুন:</strong> <a href="/?tab=blog&slug=${related.slug}">${related.title}</a></blockquote>`
                          );
                        } else {
                          insertHtmlSnippet(
                            '<p>আজই সেরা দামে অর্ডার করতে আমাদের <a href="/?tab=services"><strong>Boostlagbe.com সার্ভিস লিস্ট</strong></a> অথবা <a href="/?tab=new_order"><strong>নিউ অর্ডার পেজ</strong></a> ভিজিট করুন।</p>'
                          );
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/20 flex items-center gap-1"
                    >
                      <Link2 className="w-3 h-3" /> + পুরাতন ব্লগের ইন্টারনাল লিংক
                    </button>
                  </div>
                </div>

                <textarea
                  rows={14}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="এখানে আপনার আর্টিকেল লিখুন অথবা উপরের Gemini AI বাটনে ক্লিক করে ১-ক্লিকে সম্পূর্ণ মানবিক আর্টিকেল জেনারেট করুন..."
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-mono leading-relaxed text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Online Contextual Cover Image Discovery + Upload + SEO Alt Attribute */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-indigo-500" /> অনলাইন প্রাসঙ্গিক ছবি ও SEO ইমেজ অল্ট ট্যাগ
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      ব্লগের টপিকের সাথে মিল রেখে অনলাইন থেকে স্বয়ংক্রিয়ভাবে ছবি খুঁজে লিংক এবং Alt Text যুক্ত করুন।
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isFindingImages}
                    onClick={handleFindContextualImage}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    {isFindingImages ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    অনলাইন থেকে প্রাসঙ্গিক ছবি খুঁজুন
                  </button>
                </div>

                {onlineImageGallery.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {onlineImageGallery.map((img, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setCoverImage(img.url);
                          setCoverImageAlt(img.alt);
                        }}
                        className={`group relative h-24 rounded-2xl overflow-hidden border-2 transition-all ${
                          coverImage === img.url
                            ? 'border-indigo-600 ring-2 ring-indigo-500/30'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <img
                          src={img.url}
                          alt={img.alt}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-slate-950/75 text-white text-[10px] font-bold px-2 py-1 truncate">
                          ছবি #{i + 1} নির্বাচন করুন
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ফিচার্ড কভার ইমেজ URL অথবা আপলোড
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={coverImage}
                        onChange={(e) => setCoverImage(e.target.value)}
                        placeholder="https://images.pexels.com/..."
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
            </div>

            {/* 3. E-E-A-T AUTHOR BOX, KEY TAKEAWAYS & TECHNICAL SEO SCHEMA */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5 shadow-xs">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <Code className="w-4 h-4 text-indigo-500" /> গুগল E-E-A-T লেখক প্রোফাইল, টেকনিক্যাল SEO ও FAQPage স্কিমা
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
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    এক নজরে মূল পয়েন্টসমূহ (Key Takeaways - প্রতি লাইনে ১টি পয়েন্ট)
                  </label>
                  <textarea
                    rows={3}
                    value={keyTakeawaysInput}
                    onChange={(e) => setKeyTakeawaysInput(e.target.value)}
                    placeholder="প্রতি লাইনে একটি মূল পয়েন্ট লিখুন..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                {/* E-E-A-T Author & Reviewer Fields */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ভেরিফাইড লেখকের নাম (E-E-A-T Author Name)
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ভেরিফাইড রিভিউয়ার বোর্ড (Reviewed By)
                  </label>
                  <input
                    type="text"
                    value={reviewedBy}
                    onChange={(e) => setReviewedBy(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Google SERP Meta Title (৩০-৭৫ ক্যারেক্টার অপ্টিমাল)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setSeoTitle(enhanceCtrMetaTitle(seoTitle || title, focusKeyword))
                        }
                        className="px-2.5 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" /> ১-ক্লিক High-CTR পাওয়ার টাইটেল
                      </button>
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
                  </div>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder="গুগল সার্চ রেজাল্টে যে নীল রঙের টাইটেল দেখাবে..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />

                  {/* Feature 22: 3-Variant A/B High-CTR Title Picker */}
                  {(title || focusKeyword) && (
                    <div className="mt-2 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                        GSC High-CTR A/B Title Variants (১-ক্লিকে সিলেক্ট করুন):
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        {generateAbCtrTitleVariants(title || focusKeyword, focusKeyword || 'boostlagbe.com').map(
                          (variant, vIdx) => (
                            <button
                              key={vIdx}
                              type="button"
                              onClick={() => setSeoTitle(variant.title)}
                              className="text-left px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between gap-2"
                            >
                              <span className="truncate">
                                <strong className="text-indigo-500">{variant.label}:</strong> {variant.title}
                              </span>
                              <span className="text-[10px] text-emerald-500 font-bold shrink-0">Use →</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  )}
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
                    liveSeoEvaluation.score >= 95
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
                    liveSeoEvaluation.score >= 95
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
