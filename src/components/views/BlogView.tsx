import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Clock,
  ArrowLeft,
  Share2,
  Check,
  ChevronRight,
  Zap,
  HelpCircle,
  ChevronDown,
  Award,
  TrendingUp,
  Layers,
  List,
  ShieldCheck,
  CheckCircle2,
  Volume2,
  Square,
  Bookmark,
  BookmarkCheck,
  Calculator,
  Gift,
  Star,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Send,
  Copy,
  FileDown,
  Globe,
  Hash,
  BarChart3,
  Lock,
  Unlock,
  X
} from 'lucide-react';
import {
  SMMBlogPost,
  SMMService,
  SiteSettings,
  UserProfile,
  Coupon
} from '../../types';
import {
  incrementBlogViews,
  voteBlogHelpfulAndRating,
  addBlogCommentOrQuestion,
  analyzeProfileLinkHealth,
  MONETIZATION_COMBO_BUNDLES,
  generate60sReelsScriptFromBlog,
  recordBlogConversionEvent
} from '../../services/blogSeoService';

interface BlogViewProps {
  blogs: SMMBlogPost[];
  services: SMMService[];
  siteSettings?: SiteSettings;
  userProfile?: UserProfile | null;
  coupons?: Coupon[];
  selectedSlug?: string | null;
  onSelectSlug: (slug: string | null) => void;
  onNavigate: (tab: string) => void;
  onSelectService?: (service: SMMService) => void;
  isPublicStandalone?: boolean;
  onOpenAuth?: () => void;
}

const FALLBACK_BLOG_IMAGE =
  'https://images.pexels.com/photos/267350/pexels-photo-267350.jpeg?auto=compress&cs=tinysrgb&w=1200';

const BOOKMARKS_STORAGE_KEY = 'boostlagbe_saved_blogs_v1';

const MONETIZATION_CHECKLIST_ITEMS = [
  'পেজ বা চ্যানেলে গত ৩০ দিনে কোনো Community Guidelines বা Policy Issue নেই',
  'আপলোড করা ভিডিও বা রিলস ১০০% নিজস্ব ভয়েস/ফেস বা অরিজিনাল এডিটিংযুক্ত (কপিরাইট মিউজিক ছাড়া)',
  'প্রোফাইল বা পেজের নাম, লোগো, বায়ো এবং পাবলিক প্রাইভেসি সেটিংস সম্পূর্ণ প্রফেশনাল',
  'প্রাথমিক সোশ্যাল প্রুফ (৫,০০০+ ফলোয়ার বা ১,০০০+ সাবস্ক্রাইবার) ও ওয়াচটাইম লক্ষ্যমাত্রা পূরণ হয়েছে',
  'সন্ধ্যা ৭টা–১১টার পিক টাইমে সপ্তাহে অন্তত ৪-৫টি হাই-রিটেনশন কন্টেন্ট আপলোড করা হচ্ছে'
];

const BD_BEST_POST_TIMES = [
  {
    platform: 'Facebook Page & Reels',
    primeSlot: 'সন্ধ্যা ৭:৩০ – রাত ১০:৩০ (BST)',
    secondarySlot: 'দুপুর ১:৩০ – বিকেল ৩:০০',
    tip: 'রিলস আপলোডের প্রথম ৩০ মিনিটে কমেন্টের রিপ্লাই দিলে অর্গানিক রিচ ৩ গুণ বাড়ে।'
  },
  {
    platform: 'YouTube Long & Shorts',
    primeSlot: 'সন্ধ্যা ৬:০০ – রাত ৯:৩০ (BST)',
    secondarySlot: 'শুক্রবার বিকেল ৩:০০ – ৫:০০',
    tip: 'ভিডিও পাবলিশ করার ১ ঘণ্টা আগে Community Tab-এ পোল বা টিজার দিন।'
  },
  {
    platform: 'TikTok Bangladesh',
    primeSlot: 'রাত ৮:০০ – রাত ১১:৩০ (BST)',
    secondarySlot: 'সকাল ৯:০০ – বেলা ১১:০০',
    tip: 'প্রথম ৩ সেকেন্ডে টেক্সট হুক ও ট্রেন্ডিং সাউন্ড ব্যবহার করলে দ্রুত ForYou পেজে যায়।'
  },
  {
    platform: 'Instagram Reels & Business',
    primeSlot: 'সন্ধ্যা ৭:০০ – রাত ১০:০০ (BST)',
    secondarySlot: 'দুপুর ১২:৩০ – ২:০০',
    tip: 'ক্যারোসেল পোস্ট ও রিলসে লোকেশন ট্যাগ (Dhaka, Bangladesh) ব্যবহার করুন।'
  }
];

export const BlogView: React.FC<BlogViewProps> = ({
  blogs,
  services,
  siteSettings,
  userProfile,
  coupons = [],
  selectedSlug,
  onSelectSlug,
  onNavigate,
  onSelectService,
  isPublicStandalone = false,
  onOpenAuth
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeHubSection, setActiveHubSection] = useState<'articles' | 'tools'>('articles');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Reading Progress & Bookmarks
  const [readingProgress, setReadingProgress] = useState(0);
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Language & Audio TTS Player
  const [languageView, setLanguageView] = useState<'bn' | 'en'>('bn');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState<1 | 1.25>(1);

  // Live Service Price Estimator
  const [calcServiceId, setCalcServiceId] = useState<string>('');
  const [calcQuantity, setCalcQuantity] = useState<number>(1000);
  const [expressCheckoutOpen, setExpressCheckoutOpen] = useState(false);
  const [expressTargetLink, setExpressTargetLink] = useState('');
  const [expressOrderSuccess, setExpressOrderSuccess] = useState(false);

  // Creator Toolkit Tabs
  const [activeMicroTool, setActiveMicroTool] = useState<
    'earnings' | 'besttime' | 'checklist' | 'linkscanner' | 'combos' | 'reelsscript'
  >('earnings');
  const [earningsPlatform, setEarningsPlatform] = useState<'facebook' | 'youtube' | 'tiktok'>('facebook');
  const [monthlyViewsInput, setMonthlyViewsInput] = useState<number>(500000);
  const [checkedReadyItems, setCheckedReadyItems] = useState<number[]>([0, 1, 2]);
  const [scannerInputUrl, setScannerInputUrl] = useState('');
  const [scannerResult, setScannerResult] = useState<ReturnType<typeof analyzeProfileLinkHealth> | null>(null);

  // Quiz & Promo Unlock
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [promoUnlocked, setPromoUnlocked] = useState(false);

  // Helpfulness Voting & Q&A Comments
  const [hasVotedHelpful, setHasVotedHelpful] = useState<'yes' | 'no' | null>(null);
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [commentAuthor, setCommentAuthor] = useState(userProfile?.displayName || '');
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSuccessMsg, setCommentSuccessMsg] = useState('');

  const publishedBlogs = useMemo(
    () =>
      blogs
        .filter((b) => b.status === 'published')
        .sort((a, b) => (b.publishedAt || b.createdAt || 0) - (a.publishedAt || a.createdAt || 0)),
    [blogs]
  );

  const activePost = useMemo(() => {
    if (!selectedSlug) return null;
    const clean = selectedSlug.trim().toLowerCase();
    return (
      publishedBlogs.find((b) => b.slug.toLowerCase() === clean || b.id.toLowerCase() === clean) ||
      null
    );
  }, [publishedBlogs, selectedSlug]);

  // Reading progress listener
  useEffect(() => {
    if (!activePost) {
      setReadingProgress(0);
      return;
    }
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (docHeight <= 0) {
        setReadingProgress(0);
        return;
      }
      const pct = Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100)));
      setReadingProgress(pct);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activePost?.id]);

  // Reset article states when switching post
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setLanguageView('bn');
    setSelectedQuizOption(null);
    setPromoUnlocked(false);
    setHasVotedHelpful(null);
    setExpressCheckoutOpen(false);
    setExpressOrderSuccess(false);
    if (activePost) {
      incrementBlogViews(activePost.id, activePost.views || 0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activePost?.id]);

  const toggleBookmark = (slug: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBookmarkedSlugs((prev) => {
      const exists = prev.includes(slug);
      const next = exists ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage error
      }
      return next;
    });
  };

  const categories = useMemo(() => {
    const set = new Set<string>(['All', 'Saved']);
    publishedBlogs.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [publishedBlogs]);

  const filteredBlogs = useMemo(() => {
    return publishedBlogs.filter((post) => {
      if (selectedCategory === 'Saved') {
        if (!bookmarkedSlugs.includes(post.slug)) return false;
      } else if (selectedCategory !== 'All' && post.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.focusKeyword.toLowerCase().includes(q) ||
        (post.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        (post.secondaryKeywords || []).some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [publishedBlogs, selectedCategory, searchQuery, bookmarkedSlugs]);

  const featuredLeadPost = useMemo(() => {
    if (searchQuery.trim() || selectedCategory !== 'All') return null;
    return filteredBlogs[0] || null;
  }, [filteredBlogs, searchQuery, selectedCategory]);

  const gridBlogs = useMemo(() => {
    if (featuredLeadPost && filteredBlogs.length > 1) {
      return filteredBlogs.slice(1);
    }
    return filteredBlogs;
  }, [filteredBlogs, featuredLeadPost]);

  // Extract Table of Contents headings and inject anchor IDs into HTML content
  const processedArticle = useMemo(() => {
    if (!activePost) return { html: '', toc: [] as { id: string; text: string; level: number }[] };
    const toc: { id: string; text: string; level: number }[] = [];
    let index = 0;

    const htmlWithIds = (activePost.content || '').replace(
      /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi,
      (_match, tag: string, attrs: string, inner: string) => {
        const plainText = inner.replace(/<[^>]+>/g, '').trim();
        const headingId = `section-${index++}`;
        const level = tag.toLowerCase() === 'h2' ? 2 : 3;
        if (plainText) {
          toc.push({ id: headingId, text: plainText, level });
        }
        return `<${tag}${attrs} id="${headingId}" class="scroll-mt-24">${inner}</${tag}>`;
      }
    );

    return { html: htmlWithIds, toc };
  }, [activePost]);

  const relatedServices = useMemo(() => {
    if (!activePost) return services.slice(0, 6);
    const cat = activePost.category.toLowerCase();
    const matched = services.filter(
      (s) =>
        s.category.toLowerCase().includes(cat) ||
        cat.includes(s.category.toLowerCase()) ||
        activePost.focusKeyword.toLowerCase().includes(s.category.toLowerCase())
    );
    return (matched.length > 0 ? matched : services).slice(0, 6);
  }, [activePost, services]);

  useEffect(() => {
    if (relatedServices.length > 0) {
      setCalcServiceId(relatedServices[0].id);
      setCalcQuantity(Math.max(100, relatedServices[0].min || 1000));
    }
  }, [relatedServices]);

  const selectedCalcService = useMemo(() => {
    return (
      relatedServices.find((s) => s.id === calcServiceId) ||
      relatedServices[0] ||
      services[0] ||
      null
    );
  }, [relatedServices, calcServiceId, services]);

  const estimatedServicePriceBdt = useMemo(() => {
    if (!selectedCalcService) return 0;
    const rate = selectedCalcService.rate || selectedCalcService.ratePer1000 || 25;
    return Number(((rate * Math.max(1, calcQuantity)) / 1000).toFixed(2));
  }, [selectedCalcService, calcQuantity]);

  const siloClusterPosts = useMemo(() => {
    if (!activePost) return [];
    const sameCat = publishedBlogs.filter((b) => b.category === activePost.category);
    return sameCat.length >= 2 ? sameCat.slice(0, 5) : publishedBlogs.slice(0, 5);
  }, [publishedBlogs, activePost]);

  const relatedPosts = useMemo(() => {
    if (!activePost) return [];
    return publishedBlogs.filter((b) => b.id !== activePost.id).slice(0, 4);
  }, [publishedBlogs, activePost]);

  const creatorEarningsEstimate = useMemo(() => {
    const views = Math.max(1000, monthlyViewsInput || 0);
    const rpmUsd =
      earningsPlatform === 'youtube' ? 0.85 : earningsPlatform === 'facebook' ? 0.55 : 0.28;
    const usd = Math.round((views / 1000) * rpmUsd);
    const bdt = Math.round(usd * 120);
    return { usd, bdt, rpmUsd };
  }, [earningsPlatform, monthlyViewsInput]);

  const effectiveSecretPromo = useMemo(() => {
    const activeCoupon = coupons.find((c) => c.active);
    const code = activePost?.secretPromoCode || activeCoupon?.code || 'BLOGVIP';
    const desc =
      activePost?.secretPromoDiscountText ||
      (activeCoupon
        ? `এই কোডটি ব্যবহারে পাবেন ৳${activeCoupon.amount} ফ্রি ওয়ালেট বোনাস!`
        : 'ব্লগ পাঠকদের জন্য স্পেশাল প্রোমো কোড — ডিপোজিট ও অর্ডারে প্রাধান্য সুবিধা!');
    return { code, desc };
  }, [activePost, coupons]);

  const referralShareUrl = useMemo(() => {
    if (!activePost) return window.location.origin;
    const refCode = userProfile?.referralCode || 'BOOSTVIP';
    return `${window.location.origin}/?tab=blog&slug=${encodeURIComponent(
      activePost.slug
    )}&ref=${encodeURIComponent(refCode)}`;
  }, [activePost, userProfile?.referralCode]);

  const handleCopyCanonicalLink = (post: SMMBlogPost) => {
    const url = `${window.location.origin}/?tab=blog&slug=${encodeURIComponent(post.slug)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyReferralLink = () => {
    navigator.clipboard.writeText(referralShareUrl);
    setCopiedReferral(true);
    setTimeout(() => setCopiedReferral(false), 2500);
  };

  const handleToggleSpeech = () => {
    if (!activePost || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const plainBody = (activePost.content || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const textToRead =
      languageView === 'en' && activePost.englishSummary
        ? `${activePost.title}. ${activePost.englishSummary}`
        : `${activePost.title}। ${activePost.excerpt}। ${(activePost.keyTakeaways || []).join('। ')}। ${plainBody.slice(0, 1800)}`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = languageView === 'en' ? 'en-US' : 'bn-BD';
    utterance.rate = speechRate;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleVoteHelpful = async (helpful: boolean) => {
    if (!activePost || hasVotedHelpful) return;
    setHasVotedHelpful(helpful ? 'yes' : 'no');
    try {
      await voteBlogHelpfulAndRating(activePost, helpful, selectedStars);
    } catch {
      // ignore
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePost || !commentText.trim()) return;
    setIsSubmittingComment(true);
    try {
      await addBlogCommentOrQuestion(activePost, {
        authorName: commentAuthor.trim() || userProfile?.displayName || 'ভেরিফাইড ক্রিয়েটর',
        text: commentText.trim(),
        rating: selectedStars
      });
      setCommentText('');
      setCommentSuccessMsg('আপনার মন্তব্য ও প্রশ্নটি সফলভাবে যুক্ত হয়েছে!');
      setTimeout(() => setCommentSuccessMsg(''), 4000);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleArticleBodyClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = (e.target as HTMLElement).closest('a');
    if (!target) return;
    const href = target.getAttribute('href') || '';
    if (href.startsWith('/?tab=')) {
      e.preventDefault();
      try {
        const params = new URLSearchParams(href.slice(2));
        const tab = params.get('tab');
        const slugParam = params.get('slug');
        if (tab === 'blog' && slugParam) {
          onSelectSlug(slugParam);
        } else if (tab) {
          onNavigate(tab);
        }
      } catch {
        // ignore
      }
    }
  };

  const formatDateBn = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  const activeHowToSteps = useMemo(() => {
    if (!activePost) return [];
    if (activePost.howToSteps && activePost.howToSteps.length > 0) return activePost.howToSteps;
    return [
      {
        name: '০১. পাবলিক লিংক প্রস্তুত করুন',
        text: `আপনার ${activePost.category} প্রোফাইল, পেজ বা ভিডিওর প্রাইভেসি Public রেখে লিংকটি কপি করুন।`
      },
      {
        name: '০২. ইনস্ট্যান্ট ওয়ালেট রিচার্জ',
        text: 'ওয়ালেটে বিকাশ বা নগদ দিয়ে মাত্র ২০ টাকা থেকে তাৎক্ষণিক ব্যালেন্স যুক্ত করুন।'
      },
      {
        name: '০৩. সার্ভিস সিলেক্ট ও অটো ডেলিভারি',
        text: 'New Order সেকশন থেকে সার্ভিস সিলেক্ট করে লিংক দিন এবং Live Tracker-এ অগ্রগতি দেখুন।'
      }
    ];
  }, [activePost]);

  const activeQuiz = useMemo(() => {
    if (!activePost) return null;
    return (
      activePost.quiz || {
        question: `Boostlagbe.com-এ "${activePost.focusKeyword}" অর্ডার করার সময় কোনটি প্রয়োজন?`,
        options: [
          'শুধুমাত্র পাবলিক পেজ বা পোস্টের লিংক (কোনো পাসওয়ার্ড লাগে না)',
          'অ্যাকাউন্টের পাসওয়ার্ড ও ইমেইল',
          'ডলার ক্রেডিট কার্ড',
          '৭ দিন অপেক্ষা করা'
        ],
        correctIndex: 0,
        explanation:
          'শুধুমাত্র আপনার পাবলিক লিংক দিয়েই ১–৫ মিনিটে নিরাপদে অটোমেটিক ডেলিভারি শুরু করা যায়।'
      }
    );
  }, [activePost]);

  const activeViralHashtags = useMemo(() => {
    if (!activePost) return [];
    if (activePost.viralHashtags && activePost.viralHashtags.length > 0) {
      return activePost.viralHashtags;
    }
    return [
      `#${activePost.category.replace(/\s+/g, '')}BD`,
      '#Boostlagbe',
      '#ContentCreatorBD',
      '#ViralBangladesh',
      '#Monetization2026',
      '#SMMPanelBD'
    ];
  }, [activePost]);

  return (
    <div
      className={
        isPublicStandalone
          ? 'min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20'
          : 'space-y-6 pb-12 text-slate-900 dark:text-slate-100'
      }
    >
      {/* Top Reading Progress Bar */}
      {activePost && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-200/50 dark:bg-slate-800/50 pointer-events-none">
          <div
            className="h-full bg-indigo-600 transition-all duration-150"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}

      {/* Standalone Public Header (Only when unauthenticated visitor opens /?tab=blog) */}
      {isPublicStandalone && (
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-8">
            <button
              type="button"
              onClick={() => onNavigate('landing')}
              className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              {siteSettings?.siteName || 'Boostlagbe.com'}
            </button>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
              <button
                type="button"
                onClick={() => {
                  onSelectSlug(null);
                  setSelectedCategory('All');
                }}
                className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                সব গাইড
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectSlug(null);
                  setSelectedCategory('Facebook');
                }}
                className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Facebook
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectSlug(null);
                  setSelectedCategory('YouTube');
                }}
                className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                YouTube
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectSlug(null);
                  setSelectedCategory('TikTok');
                }}
                className="hover:text-slate-900 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                TikTok
              </button>
            </nav>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => (onOpenAuth ? onOpenAuth() : onNavigate('new-order'))}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                অর্ডার শুরু করুন
              </button>
            </div>
          </div>
        </header>
      )}

      <div className={isPublicStandalone ? 'max-w-6xl mx-auto px-4 pt-6 space-y-6' : 'space-y-6'}>
        {activePost ? (
          /* =====================================================================
             EDITORIAL ARTICLE READER VIEW
             ===================================================================== */
          <article
            itemScope
            itemType={`https://schema.org/${activePost.schemaType || 'BlogPosting'}`}
            className="space-y-6"
          >
            {/* Sticky Editorial Reader Utility Bar */}
            <nav
              aria-label="Article Navigation"
              className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectSlug(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>সব ব্লগ গাইড</span>
                </button>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {activePost.category}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Audio Reader Button */}
                <button
                  type="button"
                  onClick={handleToggleSpeech}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isSpeaking
                      ? 'bg-rose-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <Square className="w-3.5 h-3.5" />
                      <span>অডিও থামান</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>অডিও শুনুন</span>
                    </>
                  )}
                </button>

                {isSpeaking && (
                  <button
                    type="button"
                    onClick={() => setSpeechRate((r) => (r === 1 ? 1.25 : 1))}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300 cursor-pointer"
                  >
                    {speechRate}x
                  </button>
                )}

                {/* Language Switch (BN / EN Summary) */}
                <button
                  type="button"
                  onClick={() => setLanguageView((v) => (v === 'bn' ? 'en' : 'bn'))}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{languageView === 'bn' ? 'EN Summary' : 'বাংলা গাইড'}</span>
                </button>

                {/* Bookmark */}
                <button
                  type="button"
                  onClick={() => toggleBookmark(activePost.slug)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    bookmarkedSlugs.includes(activePost.slug)
                      ? 'bg-amber-50 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {bookmarkedSlugs.includes(activePost.slug) ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span>সেভড</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" />
                      <span>সেভ করুন</span>
                    </>
                  )}
                </button>

                {/* Share */}
                <button
                  type="button"
                  onClick={() => handleCopyCanonicalLink(activePost)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>কপি হয়েছে</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>শেয়ার</span>
                    </>
                  )}
                </button>
              </div>
            </nav>

            {/* Editorial Article Header & Cover Frame */}
            <header className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-8 shadow-xs space-y-5">
              {/* Unboxed Editorial Metadata Kicker */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {activePost.category}
                </span>
                <span aria-hidden="true">·</span>
                <time
                  itemProp="datePublished"
                  dateTime={new Date(
                    activePost.publishedAt || activePost.createdAt
                  ).toISOString()}
                >
                  {formatDateBn(activePost.publishedAt || activePost.createdAt)}
                </time>
                <span aria-hidden="true">·</span>
                <span>{activePost.readingTimeMinutes || 4} মিনিট পড়ুন</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {(activePost.views || 120).toLocaleString()} বার পঠিত
                </span>
                <span aria-hidden="true">·</span>
                <span>পড়া হয়েছে {readingProgress}%</span>
              </div>

              {/* Headline */}
              <h1
                itemProp="headline"
                className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight max-w-4xl"
              >
                {activePost.title}
              </h1>

              {/* Deck / Excerpt (Clean unboxed editorial lead-in, no border-l-4) */}
              <p
                itemProp="description"
                className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl"
              >
                {activePost.excerpt}
              </p>

              {/* English Summary Panel (if toggled) */}
              {languageView === 'en' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    English Executive Summary
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                    {activePost.englishSummary ||
                      `Practical 2026 guide on ${activePost.focusKeyword} in Bangladesh. Combine consistent original content with Boostlagbe.com's automated bKash/Nagad social media growth and monetization packages safely using only your public link.`}
                  </p>
                </div>
              )}

              {/* Author Byline & Print Action */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                <div
                  itemProp="author"
                  itemScope
                  itemType="https://schema.org/Person"
                  className="flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    TA
                  </div>
                  <div>
                    <span
                      itemProp="name"
                      className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block"
                    >
                      {activePost.authorName || 'তানভীর আহমেদ (Tanvir Ahmed)'}
                    </span>
                    <span
                      itemProp="jobTitle"
                      className="text-[11px] text-slate-500 dark:text-slate-400"
                    >
                      {activePost.authorRole || 'Senior Social Media Growth Strategist'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>PDF সেভ করুন</span>
                </button>
              </div>

              {/* Cover Image */}
              {activePost.coverImage && (
                <figure className="pt-2">
                  <div className="relative aspect-video max-h-[420px] w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-800">
                    <img
                      itemProp="image"
                      src={activePost.coverImage}
                      alt={activePost.coverImageAlt || activePost.title}
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = FALLBACK_BLOG_IMAGE;
                      }}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </figure>
              )}
            </header>

            {/* Asymmetric 2-Column Reading Canvas (8 Cols Article / 4 Cols Margin Rail) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 8 Cols: Main Reading Column */}
              <div className="lg:col-span-8 space-y-6 min-w-0">
                {/* Key Takeaways Card */}
                {activePost.keyTakeaways && activePost.keyTakeaways.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-white">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>এক নজরে মূল পয়েন্টসমূহ (Key Takeaways)</span>
                    </div>
                    <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {activePost.keyTakeaways.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            0{idx + 1}.
                          </span>
                          <span className="leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Table of Contents */}
                {processedArticle.toc.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
                    <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white mb-3">
                      <List className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>সূচিপত্র (Table of Contents)</span>
                    </div>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                      {processedArticle.toc.map((item, idx) => (
                        <li
                          key={item.id}
                          className={
                            item.level === 3
                              ? 'text-slate-600 dark:text-slate-400'
                              : 'font-semibold text-slate-800 dark:text-slate-200'
                          }
                        >
                          <a
                            href={`#${item.id}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-start gap-2 transition-colors py-0.5"
                          >
                            <span className="text-indigo-600 dark:text-indigo-400 font-mono text-xs tabular-nums shrink-0">
                              {String(idx + 1).padStart(2, '0')}.
                            </span>
                            <span className="line-clamp-1">{item.text}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Main Long-Form Editorial Body */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-8 shadow-xs">
                  <div
                    itemProp="articleBody"
                    onClick={handleArticleBodyClick}
                    className="prose prose-slate dark:prose-invert max-w-none
                      prose-headings:font-extrabold prose-headings:text-slate-900 dark:prose-headings:text-white
                      prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-3 prose-h2:pb-2.5 prose-h2:border-b prose-h2:border-slate-200 dark:prose-h2:border-slate-800
                      prose-h3:text-lg sm:prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-2
                      prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                      prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-li:my-1.5
                      prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:font-bold hover:prose-a:underline
                      prose-blockquote:border prose-blockquote:border-slate-200 dark:prose-blockquote:border-slate-800 prose-blockquote:bg-slate-50 dark:prose-blockquote:bg-slate-800/50 prose-blockquote:p-4 prose-blockquote:rounded-2xl prose-blockquote:not-italic
                      prose-table:w-full prose-table:border-collapse prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:p-3 prose-th:text-left prose-td:p-3 prose-td:border-t prose-td:border-slate-200 dark:prose-td:border-slate-800
                      prose-img:rounded-2xl
                      prose-strong:text-slate-900 dark:prose-strong:text-white"
                    dangerouslySetInnerHTML={{ __html: processedArticle.html }}
                  />

                  {/* Step-by-Step HowTo Section */}
                  {activeHowToSteps.length > 0 && (
                    <div
                      itemScope
                      itemProp="step"
                      itemType="https://schema.org/HowTo"
                      className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 space-y-4"
                    >
                      <h3
                        itemProp="name"
                        className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white"
                      >
                        ধাপে ধাপে বাস্তবায়ন গাইড (Step-by-Step Action Plan)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        {activeHowToSteps.map((step, idx) => (
                          <div
                            key={idx}
                            itemScope
                            itemProp="step"
                            itemType="https://schema.org/HowToStep"
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5"
                          >
                            <span className="font-mono text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                              ধাপ ০{idx + 1}
                            </span>
                            <h4
                              itemProp="name"
                              className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white"
                            >
                              {step.name || step.title || `ধাপ ${idx + 1}`}
                            </h4>
                            <p
                              itemProp="text"
                              className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed"
                            >
                              {step.text || step.description || ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* In-Article Live Service Rate Calculator & Instant Order Card */}
                {selectedCalcService && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <Calculator className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                            লাইভ সার্ভিস রেট ক্যালকুলেটর ({activePost.category})
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            আপনার কাঙ্ক্ষিত সার্ভিস ও পরিমাণ সিলেক্ট করে তাৎক্ষণিক খরচ দেখুন
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-6 space-y-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                          সার্ভিস নির্বাচন করুন
                        </label>
                        <select
                          value={selectedCalcService.id}
                          onChange={(e) => setCalcServiceId(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          {relatedServices.map((srv) => (
                            <option key={srv.id} value={srv.id}>
                              #{srv.id} — {srv.name} (৳{srv.rate || srv.ratePer1000}/1K)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block">
                          পরিমাণ (Quantity)
                        </label>
                        <input
                          type="number"
                          min={selectedCalcService.min || 100}
                          max={selectedCalcService.max || 1000000}
                          step={100}
                          value={calcQuantity}
                          onChange={(e) => setCalcQuantity(Math.max(100, Number(e.target.value)))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono font-extrabold text-slate-900 dark:text-white tabular-nums"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (activePost) {
                              recordBlogConversionEvent(
                                activePost,
                                'calculator_click',
                                estimatedServicePriceBdt
                              );
                            }
                            setExpressCheckoutOpen(true);
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>মাত্র ৳{estimatedServicePriceBdt} অর্ডার</span>
                        </button>
                      </div>
                    </div>

                    {/* Express Order Drawer */}
                    {expressCheckoutOpen && (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                            কুইক অর্ডার কনফিগারেশন ({selectedCalcService.name})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setExpressCheckoutOpen(false);
                              setExpressOrderSuccess(false);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {expressOrderSuccess ? (
                          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              ✓ অর্ডার প্রস্তুত! নিউ অর্ডার পেজে কনফার্ম করুন।
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectService) {
                                  onSelectService(selectedCalcService);
                                } else {
                                  onNavigate('new-order');
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                            >
                              অর্ডার পেজে যান →
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="url"
                              value={expressTargetLink}
                              onChange={(e) => setExpressTargetLink(e.target.value)}
                              placeholder="আপনার পাবলিক পেজ বা ভিডিও লিংক দিন (https://...)"
                              className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (activePost) {
                                  recordBlogConversionEvent(
                                    activePost,
                                    'express_order',
                                    estimatedServicePriceBdt
                                  );
                                }
                                setExpressOrderSuccess(true);
                              }}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                            >
                              অর্ডার প্রস্তুত করুন (৳{estimatedServicePriceBdt})
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Quiz & Reader Promo Unlock */}
                {activeQuiz && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
                    <div className="flex items-center gap-2">
                      <Gift className="w-5 h-5 text-amber-500" />
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        পাঠক কুইজ ও প্রোমো কোড রিওয়ার্ড
                      </h3>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                      প্রশ্ন: {activeQuiz.question}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {activeQuiz.options.map((opt, idx) => {
                        const isSelected = selectedQuizOption === idx;
                        const isCorrect = idx === activeQuiz.correctIndex;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedQuizOption(idx);
                              setPromoUnlocked(true);
                            }}
                            className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between gap-2 cursor-pointer ${
                              isSelected
                                ? isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-50 dark:bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300'
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span>{opt}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {selectedQuizOption !== null && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ {activeQuiz.explanation}
                      </p>
                    )}

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {promoUnlocked ? (
                          <Unlock className="w-5 h-5 text-emerald-600 shrink-0" />
                        ) : (
                          <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                        )}
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            {effectiveSecretPromo.desc}
                          </span>
                          <span className="text-xs sm:text-sm font-mono font-extrabold text-slate-900 dark:text-white">
                            প্রোমো কোড:{' '}
                            <strong className="text-indigo-600 dark:text-indigo-400">
                              {promoUnlocked ? effectiveSecretPromo.code : '••••••'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      {!promoUnlocked ? (
                        <button
                          type="button"
                          onClick={() => setPromoUnlocked(true)}
                          className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                        >
                          কোড আনলক করুন
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(effectiveSecretPromo.code);
                            setCopiedPromo(true);
                            setTimeout(() => setCopiedPromo(false), 2500);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedPromo ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> কপি হয়েছে
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> কোড কপি করুন
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* FAQ Section */}
                {activePost.faqItems && activePost.faqItems.length > 0 && (
                  <section
                    itemScope
                    itemType="https://schema.org/FAQPage"
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <HelpCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)
                      </h2>
                    </div>

                    <div className="space-y-2.5">
                      {activePost.faqItems.map((faq, idx) => {
                        const isOpen = openFaqIndex === idx;
                        return (
                          <div
                            key={idx}
                            itemScope
                            itemProp="mainEntity"
                            itemType="https://schema.org/Question"
                            className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                              className="w-full px-4 py-3.5 text-left bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                            >
                              <span
                                itemProp="name"
                                className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white"
                              >
                                {faq.question}
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                                  isOpen ? 'rotate-180 text-indigo-600' : ''
                                }`}
                              />
                            </button>
                            {isOpen && (
                              <div
                                itemScope
                                itemProp="acceptedAnswer"
                                itemType="https://schema.org/Answer"
                                className="px-4 py-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 border-t border-slate-200/70 dark:border-slate-800"
                              >
                                <div itemProp="text">{faq.answer}</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Rating & Reader Comments */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-6">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                        এই গাইডটি কি আপনার উপকারে এসেছে?
                      </h3>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setSelectedStars(st)}
                            className="p-0.5 cursor-pointer"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                st <= selectedStars
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2">
                          {activePost.ratingValue || 4.9}/5 ({activePost.ratingCount || 68} রিভিউ)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={hasVotedHelpful !== null}
                        onClick={() => handleVoteHelpful(true)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                          hasVotedHelpful === 'yes'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" />
                        <span>হ্যাঁ ({activePost.helpfulYesCount || 72})</span>
                      </button>
                      <button
                        type="button"
                        disabled={hasVotedHelpful !== null}
                        onClick={() => handleVoteHelpful(false)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
                          hasVotedHelpful === 'no'
                            ? 'bg-rose-600 text-white border-rose-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5 text-rose-500" />
                        <span>না ({activePost.helpfulNoCount || 2})</span>
                      </button>
                    </div>
                  </div>

                  {/* Comment Form */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        পাঠকদের প্রশ্ন ও মন্তব্য ({(activePost.comments || []).length})
                      </h3>
                    </div>

                    {commentSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                        {commentSuccessMsg}
                      </div>
                    )}

                    <form onSubmit={handleSubmitComment} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={commentAuthor}
                          onChange={(e) => setCommentAuthor(e.target.value)}
                          placeholder="আপনার নাম"
                          className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="আপনার প্রশ্ন বা মতামত লিখুন..."
                          className="sm:col-span-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !commentText.trim()}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>মন্তব্য পোস্ট করুন</span>
                      </button>
                    </form>

                    {(activePost.comments || []).length > 0 && (
                      <div className="space-y-3 pt-2">
                        {(activePost.comments || []).map((cmt) => (
                          <div
                            key={cmt.id}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {cmt.authorName || cmt.userName || 'ভেরিফাইড পাঠক'}
                              </span>
                              <span className="text-[11px] text-amber-500 font-bold">
                                {'★'.repeat(cmt.rating || 5)}
                              </span>
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                              {cmt.text || cmt.questionOrComment || ''}
                            </p>
                            {cmt.adminReply && (
                              <div className="mt-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                                  ✓ Boostlagbe Support:
                                </span>
                                {cmt.adminReply}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right 4 Cols: Sticky Editorial Sidebar */}
              <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-20">
                {/* Topic Series Navigation */}
                {siloClusterPosts.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        {activePost.category} গাইড সিরিজ
                      </span>
                      <span>{siloClusterPosts.length} পর্ব</span>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {siloClusterPosts.map((sp, idx) => {
                        const isCurrent = sp.id === activePost.id;
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => onSelectSlug(sp.slug)}
                            className={`w-full text-left py-2.5 first:pt-0 last:pb-0 flex items-start gap-2.5 text-xs transition-colors cursor-pointer ${
                              isCurrent
                                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                                : 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}
                          >
                            <span className="font-mono text-[11px] text-slate-400 shrink-0 mt-0.5 tabular-nums">
                              0{idx + 1}.
                            </span>
                            <span className="line-clamp-2 leading-snug">{sp.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Related Popular Services */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>জনপ্রিয় বুস্ট সার্ভিস</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => onNavigate('services')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      সব দেখুন
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {relatedServices.slice(0, 4).map((srv) => (
                      <div
                        key={srv.id}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[150px]">
                            {srv.category}
                          </span>
                          <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            ৳{srv.rate || srv.ratePer1000} / 1K
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
                          {srv.name}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectService) {
                              onSelectService(srv);
                            } else {
                              onNavigate('new-order');
                            }
                          }}
                          className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          <span>অর্ডার করুন</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Referral Share Card */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                  <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    শেয়ার ও রেফারেল আয়
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    গাইডটি শেয়ার করে প্রতি রেফারেলে ৳১০ বোনাস পান
                  </h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={referralShareUrl}
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-mono text-slate-600 dark:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={handleCopyReferralLink}
                      className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                    >
                      {copiedReferral ? 'কপিড!' : 'কপি'}
                    </button>
                  </div>
                </div>

                {/* Viral Hashtags Box */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>ভাইরাল হ্যাশট্যাগ</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(activeViralHashtags.join(' '));
                        setCopiedHashtags(true);
                        setTimeout(() => setCopiedHashtags(false), 2000);
                      }}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      {copiedHashtags ? 'কপি হয়েছে!' : 'সব কপি করুন'}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-slate-600 dark:text-slate-400 leading-relaxed">
                    {activeViralHashtags.join('  ')}
                  </p>
                </div>

                {/* Related Articles */}
                {relatedPosts.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-3">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      আরও পড়ুন
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {relatedPosts.map((rp) => (
                        <button
                          key={rp.id}
                          type="button"
                          onClick={() => onSelectSlug(rp.slug)}
                          className="w-full text-left py-2.5 first:pt-0 last:pb-0 group cursor-pointer"
                        >
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {rp.category} · {rp.readingTimeMinutes || 4} মিনিট
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 mt-0.5">
                            {rp.title}
                          </h4>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </article>
        ) : (
          /* =====================================================================
             BLOG HUB & CREATOR JOURNAL FRONT PAGE
             ===================================================================== */
          <div className="space-y-6">
            {/* Clean Editorial Masthead + Mode Switcher */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-5">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    Boostlagbe.com · অফিসিয়াল ব্লগ ও ক্রিয়েটর গাইড
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    সোশ্যাল মিডিয়া গ্রোথ ও মনিটাইজেশন জার্নাল
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    ফেসবুক পেজ মনিটাইজেশন, ইউটিউব ৪০০০ ঘণ্টা ওয়াচটাইম, টিকটক ভাইরাল স্ট্র্যাটেজি এবং ফ্রি ক্রিয়েটর টুলকিট।
                  </p>
                </div>

                {/* Primary View Switcher: Articles vs Creator Toolkit */}
                <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start lg:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveHubSection('articles')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      activeHubSection === 'articles'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>সব আর্টিকেল ({publishedBlogs.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveHubSection('tools')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                      activeHubSection === 'tools'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>ক্রিয়েটর টুলকিট</span>
                  </button>
                </div>
              </div>

              {/* Search & Category Filter Bar */}
              {activeHubSection === 'articles' && (
                <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="টপিক বা কীওয়ার্ড দিয়ে গাইড খুঁজুন (যেমন: ফেসবুক মনিটাইজেশন, ইউটিউব ভিউ)..."
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Interactive Category Filter Buttons */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          selectedCategory === cat
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {cat === 'All'
                          ? 'সব ক্যাটাগরি'
                          : cat === 'Saved'
                          ? `সেভ করা (${bookmarkedSlugs.length})`
                          : cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {activeHubSection === 'tools' ? (
              /* =================================================================
                 CREATOR GROWTH TOOLKIT VIEW (Clean Interactive Utility Suite)
                 ================================================================= */
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 sm:p-7 shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                      ফ্রি ক্রিয়েটর গ্রোথ ও মনিটাইজেশন টুলবক্স
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      ইনকাম ক্যালকুলেটর, লিংক হেলথ স্ক্যানার, সেরা পোস্ট টাইম এবং মনিটাইজেশন কম্বো প্যাক
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-2xl bg-slate-100 dark:bg-slate-800">
                    {[
                      { id: 'earnings', label: 'ইনকাম ক্যালকুলেটর', icon: BarChart3 },
                      { id: 'linkscanner', label: 'লিংক স্ক্যানার', icon: ShieldCheck },
                      { id: 'besttime', label: 'সেরা পোস্ট টাইম', icon: Clock },
                      { id: 'checklist', label: 'মনিটাইজেশন চেকলিস্ট', icon: CheckCircle2 },
                      { id: 'combos', label: 'কম্বো প্যাক', icon: Zap },
                      { id: 'reelsscript', label: '৬০ সে. রিলস স্ক্রিপ্ট', icon: Layers }
                    ].map((tItem) => {
                      const TIcon = tItem.icon;
                      const active = activeMicroTool === tItem.id;
                      return (
                        <button
                          key={tItem.id}
                          type="button"
                          onClick={() => setActiveMicroTool(tItem.id as any)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                            active
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          <TIcon className="w-3.5 h-3.5" />
                          <span>{tItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tool 1: Earnings Calculator */}
                {activeMicroTool === 'earnings' && (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          প্ল্যাটফর্ম নির্বাচন করুন
                        </label>
                        <select
                          value={earningsPlatform}
                          onChange={(e) =>
                            setEarningsPlatform(e.target.value as 'facebook' | 'youtube' | 'tiktok')
                          }
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                        >
                          <option value="facebook">Facebook In-Stream & Ads on Reels (BD)</option>
                          <option value="youtube">YouTube Long Video & Shorts AdSense</option>
                          <option value="tiktok">TikTok Creator Rewards & Live Gifts</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                          মাসিক মোট ভিউ সংখ্যা (Monthly Views)
                        </label>
                        <input
                          type="number"
                          min={10000}
                          step={50000}
                          value={monthlyViewsInput}
                          onChange={(e) => setMonthlyViewsInput(Math.max(1000, Number(e.target.value)))}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-extrabold text-slate-900 dark:text-white tabular-nums"
                        />
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 block">
                          আনুমানিক মাসিক মনিটাইজেশন আয় (গড় RPM: ~${creatorEarningsEstimate.rpmUsd}/1K)
                        </span>
                        <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                          ৳{creatorEarningsEstimate.bdt.toLocaleString()} BDT{' '}
                          <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                            (~${creatorEarningsEstimate.usd.toLocaleString()} USD)
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigate('services')}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                      >
                        মনিটাইজেশন সার্ভিস দেখুন →
                      </button>
                    </div>
                  </div>
                )}

                {/* Tool 2: Link Scanner */}
                {activeMicroTool === 'linkscanner' && (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="url"
                        value={scannerInputUrl}
                        onChange={(e) => setScannerInputUrl(e.target.value)}
                        placeholder="https://www.facebook.com/yourpage অথবা https://www.youtube.com/@channel"
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setScannerResult(
                            analyzeProfileLinkHealth(
                              scannerInputUrl || 'https://www.facebook.com/boostlagbe',
                              services
                            )
                          )
                        }
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 cursor-pointer"
                      >
                        লিংক স্ক্যান করুন
                      </button>
                    </div>

                    {scannerResult && (
                      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold">
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ✓ প্ল্যাটফর্ম: {scannerResult.detectedPlatform} · স্কোর: {scannerResult.readinessScore}/100
                          </span>
                          <span className="text-indigo-600 dark:text-indigo-400">
                            {scannerResult.statusLabel}
                          </span>
                        </div>
                        <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                          {scannerResult.diagnosticNotes.map((note: string, idx: number) => (
                            <li key={idx}>• {note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Tool 3: Best Time to Post */}
                {activeMicroTool === 'besttime' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {BD_BEST_POST_TIMES.map((row, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-1.5"
                      >
                        <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {row.platform}
                        </div>
                        <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                          পিক টাইম: {row.primeSlot}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          বিকল্প সময়: {row.secondarySlot}
                        </div>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                          টিপস: {row.tip}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tool 4: Monetization Checklist */}
                {activeMicroTool === 'checklist' && (
                  <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-700 dark:text-slate-300">
                        আপনার পেজ বা চ্যানেলের মনিটাইজেশন প্রস্তুতি যাচাই করুন:
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                        প্রস্তুতি স্কোর: {checkedReadyItems.length * 20}%
                      </span>
                    </div>
                    <div className="space-y-2">
                      {MONETIZATION_CHECKLIST_ITEMS.map((item, idx) => {
                        const checked = checkedReadyItems.includes(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setCheckedReadyItems((prev) =>
                                prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
                              )
                            }
                            className={`w-full text-left p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-3 transition-colors cursor-pointer ${
                              checked
                                ? 'bg-white dark:bg-slate-900 border-emerald-500/40 text-slate-900 dark:text-white'
                                : 'bg-white/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                                checked ? 'bg-emerald-600 text-white' : 'border border-slate-400'
                              }`}
                            >
                              {checked && <Check className="w-3 h-3" />}
                            </div>
                            <span>{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tool 5: Monetization Combo Packs */}
                {activeMicroTool === 'combos' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {MONETIZATION_COMBO_BUNDLES.map((bundle) => (
                      <div
                        key={bundle.id}
                        className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {bundle.badge}
                            </span>
                            <span className="font-mono text-slate-400 line-through">
                              ৳{bundle.regularPriceBdt}
                            </span>
                          </div>
                          <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {bundle.title}
                          </h4>
                          <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                            {bundle.items.map((it, idx) => (
                              <li key={idx} className="flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>{it}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                          <div>
                            <span className="text-[11px] text-slate-500 block">
                              কম্বো মূল্য ({bundle.timeframe})
                            </span>
                            <span className="text-base font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                              ৳{bundle.bundlePriceBdt} BDT
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onNavigate('new-order')}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>অর্ডার করুন</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tool 6: 60s Reels Script Generator */}
                {activeMicroTool === 'reelsscript' &&
                  publishedBlogs[0] &&
                  (() => {
                    const scriptObj = generate60sReelsScriptFromBlog(publishedBlogs[0]);
                    const formattedScript = `${scriptObj.hook0to5s}\n\n${scriptObj.body5to45s.join('\n')}\n\n${scriptObj.cta45to60s}\n\n--- ক্যাপশন ও হ্যাশট্যাগ ---\n${scriptObj.captionWithHashtags}`;
                    return (
                      <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            ৬০ সেকেন্ডের রিলস / টিকটক ভিডিও স্ক্রিপ্ট টেমপ্লেট
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(formattedScript);
                              setCopiedScript(true);
                              setTimeout(() => setCopiedScript(false), 2500);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedScript ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> স্ক্রিপ্ট কপি হয়েছে
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> স্ক্রিপ্ট কপি করুন
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                          {formattedScript}
                        </pre>
                      </div>
                    );
                  })()}
              </div>
            ) : (
              /* =================================================================
                 EDITORIAL ARTICLES FEED (Lead Story + Curated 3-Column Grid)
                 ================================================================= */
              <>
                {filteredBlogs.length === 0 ? (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
                    <Layers className="w-10 h-10 text-slate-400 mx-auto" />
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                      কোনো ব্লগ গাইড পাওয়া যায়নি
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      অন্য কোনো কীওয়ার্ড বা ক্যাটাগরি নির্বাচন করে আবার চেষ্টা করুন।
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold cursor-pointer"
                    >
                      সব গাইড দেখুন
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Tier 1: Lead Featured Editorial Story */}
                    {featuredLeadPost && (
                      <article
                        onClick={() => onSelectSlug(featuredLeadPost.slug)}
                        className="group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:border-indigo-500/40 transition-all grid grid-cols-1 lg:grid-cols-12 items-stretch"
                      >
                        <div className="lg:col-span-7 relative min-h-[220px] sm:min-h-[300px] bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <img
                            src={featuredLeadPost.coverImage || FALLBACK_BLOG_IMAGE}
                            alt={featuredLeadPost.coverImageAlt || featuredLeadPost.title}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = FALLBACK_BLOG_IMAGE;
                            }}
                            className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                          />
                        </div>

                        <div className="lg:col-span-5 p-5 sm:p-7 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            {/* Unboxed Metadata */}
                            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                  {featuredLeadPost.category}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span>{featuredLeadPost.readingTimeMinutes || 4} মিনিট পড়ুন</span>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => toggleBookmark(featuredLeadPost.slug, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                                title="বুকমার্ক করুন"
                              >
                                {bookmarkedSlugs.includes(featuredLeadPost.slug) ? (
                                  <BookmarkCheck className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <Bookmark className="w-4 h-4" />
                                )}
                              </button>
                            </div>

                            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                              {featuredLeadPost.title}
                            </h2>

                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                              {featuredLeadPost.excerpt}
                            </p>
                          </div>

                          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                            <span className="text-slate-500 dark:text-slate-400">
                              {formatDateBn(
                                featuredLeadPost.publishedAt || featuredLeadPost.createdAt
                              )}{' '}
                              · {(featuredLeadPost.views || 120).toLocaleString()} ভিউ
                            </span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                              <span>সম্পূর্ণ পড়ুন</span>
                              <ChevronRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </article>
                    )}

                    {/* Tier 2: Curated 3-Column Editorial Article Grid */}
                    {gridBlogs.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {gridBlogs.map((post) => {
                          const isBookmarked = bookmarkedSlugs.includes(post.slug);
                          return (
                            <article
                              key={post.id}
                              onClick={() => onSelectSlug(post.slug)}
                              className="group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs hover:border-indigo-500/40 transition-all flex flex-col"
                            >
                              <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <img
                                  src={post.coverImage || FALLBACK_BLOG_IMAGE}
                                  alt={post.coverImageAlt || post.title}
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).src = FALLBACK_BLOG_IMAGE;
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                                />
                              </div>

                              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                                <div className="space-y-2">
                                  {/* Unboxed Metadata Line */}
                                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                                        {post.category}
                                      </span>
                                      <span aria-hidden="true">·</span>
                                      <span>{post.readingTimeMinutes || 4} মিনিট</span>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-mono tabular-nums">
                                        {(post.views || 120).toLocaleString()} ভিউ
                                      </span>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => toggleBookmark(post.slug, e)}
                                      className="p-1 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shrink-0 cursor-pointer"
                                      title="বুকমার্ক করুন"
                                    >
                                      {isBookmarked ? (
                                        <BookmarkCheck className="w-4 h-4 text-amber-500" />
                                      ) : (
                                        <Bookmark className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>

                                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                                    {post.title}
                                  </h3>

                                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {post.excerpt}
                                  </p>
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                                  <span className="text-slate-400 dark:text-slate-500">
                                    {formatDateBn(post.publishedAt || post.createdAt)}
                                  </span>
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                    <span>পড়ুন</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </span>
                                </div>
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
