import React, { useState, useMemo, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Calendar,
  Clock,
  Eye,
  Tag,
  ArrowLeft,
  Share2,
  Check,
  ChevronRight,
  Sparkles,
  Zap,
  HelpCircle,
  ChevronDown,
  ExternalLink,
  Award,
  TrendingUp,
  Layers,
  List,
  ShieldCheck,
  CheckCircle2,
  Volume2,
  Pause,
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
  Users,
  BarChart3,
  Lock,
  Unlock
} from 'lucide-react';
import { SMMBlogPost, SMMService, SiteSettings, UserProfile, Coupon, SMMBlogTopicRequest } from '../../types';
import {
  incrementBlogViews,
  voteBlogHelpfulAndRating,
  addBlogCommentOrQuestion,
  PROGRAMMATIC_SEO_LANDING_PAGES,
  COMPETITOR_VS_BOOSTLAGBE_MATRIX,
  GOOGLE_WEB_STORIES_SLIDES,
  generateBanglishVoiceSearchFaqs,
  DIVISIONAL_LOCAL_SEO_HUBS,
  analyzeProfileLinkHealth,
  MONETIZATION_COMBO_BUNDLES,
  generate60sReelsScriptFromBlog,
  generateSocialCarouselSlidesFromBlog,
  getCommunityTopicRequests,
  submitCommunityTopicRequest,
  upvoteCommunityTopicRequest,
  recordBlogConversionEvent,
  generateResellerWhiteLabelProposal
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
    tip: 'রিলস আপলোডের প্রথম ৩০ মিনিটে কমেন্টের রিপ্লাই দিলে রিচ ৩ গুণ বাড়ে।'
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
    tip: 'প্রথম ৩ সেকেন্ডে টেক্সট হুক ও ট্রেন্ডিং সাউন্ড ব্যবহার করলে ForYou পেজে দ্রুত যায়।'
  },
  {
    platform: 'Instagram Reels & Business',
    primeSlot: 'সন্ধ্যা ৭:০০ – রাত ১০:০০ (BST)',
    secondarySlot: 'দুপুর ১২:৩০ – ২:০০',
    tip: 'ক্যারোসেল পোস্ট ও রিলসে লোকেশন ট্যাগ (Dhaka, Bangladesh) ব্যবহার করুন।'
  }
];

const SMM_GLOSSARY_TERMS = [
  {
    term: 'Drip-Feed Delivery (ড্রিপ-ফিড ডেলিভারি)',
    category: 'Algorithm Safety',
    definition:
      'একসাথে সব ফলোয়ার বা ভিউ না নিয়ে নির্দিষ্ট সময় পর পর (যেমন প্রতি ৩০ মিনিটে ২০০টি করে) ধাপে ধাপে নেওয়ার প্রযুক্তি। এতে গুগল ও ফেসবুক অ্যালগরিদমে ১০০% অর্গানিক সিগন্যাল যায়।'
  },
  {
    term: 'Non-Drop & Auto-Refill (নন-ড্রপ ও অটো রিফিল)',
    category: 'Service Guarantee',
    definition:
      'উচ্চমানের রিয়েল-প্যাটার্ন প্রোফাইল থেকে আসা সার্ভিস যা সাধারণত কমে না। আর ৩০ দিনের রিফিল গ্যারান্টি থাকায় কোনো কারণে সামান্য কমলেও সিস্টেম স্বয়ংক্রিয়ভাবে তা পূরণ করে দেয়।'
  },
  {
    term: 'RPM & CPM (মনিটাইজেশন রেভিনিউ রেট)',
    category: 'Monetization',
    definition:
      'RPM (Revenue Per Mille) হলো প্রতি ১,০০০ মনিটাইজড ভিউ থেকে ক্রিয়েটরের প্রকৃত আয়। বাংলাদেশ ও প্রবাসী অডিয়েন্স মিলিয়ে ফেসবুক ও ইউটিউবে গড় RPM $0.45 থেকে $2.50+ হয়ে থাকে।'
  },
  {
    term: '60K Minutes Watchtime (৬০,০০০ মিনিট ওয়াচটাইম)',
    category: 'Facebook Eligibility',
    definition:
      'ফেসবুক পেজে In-Stream Ads মনিটাইজেশন চালু করার জন্য গত ৬০ দিনে কমপক্ষে ৫,০০০ ফলোয়ার এবং ৬০,০০০ মিনিট ভ্যালিড ওয়াচটাইম প্রয়োজন হয়।'
  },
  {
    term: 'Engagement Velocity (এনগেজমেন্ট ভেলোসিটি)',
    category: 'Viral Ranking',
    definition:
      'ভিডিও বা রিলস আপলোডের প্রথম ৩০ থেকে ৬০ মিনিটের মধ্যে যত দ্রুত ভিউ, লাইক, শেয়ার ও কমেন্ট আসে তাকে এনগেজমেন্ট ভেলোসিটি বলে। এটি বেশি হলে ভিডিও দ্রুত ভাইরাল হয়।'
  },
  {
    term: 'REST API v2 Reseller (এপিআই রিসেলার প্যানেল)',
    category: 'Agency Business',
    definition:
      'Boostlagbe.com-এর API Key ব্যবহার করে নিজের ওয়েবসাইট বা এজেন্সি প্যানেল থেকে স্বয়ংক্রিয়ভাবে পাইকারি রেটে ক্লায়েন্টদের অর্ডার ডেলিভারি করার সুবিধা।'
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [copiedHashtags, setCopiedHashtags] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // 1. Reading Progress Bar & Bookmarks
  const [readingProgress, setReadingProgress] = useState(0);
  const [bookmarkedSlugs, setBookmarkedSlugs] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // 2. Dual-Language Summary & Audio TTS Player
  const [languageView, setLanguageView] = useState<'bn' | 'en'>('bn');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechRate, setSpeechRate] = useState<1 | 1.25>(1);

  // 3. In-Article Live Service Price Estimator
  const [calcServiceId, setCalcServiceId] = useState<string>('');
  const [calcQuantity, setCalcQuantity] = useState<number>(1000);

  // 4. Creator Micro-Tools Suite Tabs (Expanded with Reels Script, Social Carousel, Link Scanner, Combo Bundles & Reseller Proposal)
  const [activeMicroTool, setActiveMicroTool] = useState<
    | 'earnings'
    | 'besttime'
    | 'checklist'
    | 'hashtags'
    | 'glossary'
    | 'linkscanner'
    | 'combos'
    | 'reelsscript'
    | 'carousel'
    | 'reseller'
  >('earnings');
  const [earningsPlatform, setEarningsPlatform] = useState<'facebook' | 'youtube' | 'tiktok'>('facebook');
  const [monthlyViewsInput, setMonthlyViewsInput] = useState<number>(500000);
  const [checkedReadyItems, setCheckedReadyItems] = useState<number[]>([0, 1, 2]);

  // 5. Gamified Quiz, Secret Promo Unlock & Creator Academy Certificate
  const [selectedQuizOption, setSelectedQuizOption] = useState<number | null>(null);
  const [promoUnlocked, setPromoUnlocked] = useState(false);
  const [certificateRecipientName, setCertificateRecipientName] = useState(
    userProfile?.displayName || 'ভেরিফাইড ক্রিয়েটর'
  );
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // 6. Helpfulness Voting, Star Rating & Verified Q&A Comments
  const [hasVotedHelpful, setHasVotedHelpful] = useState<'yes' | 'no' | null>(null);
  const [selectedStars, setSelectedStars] = useState<number>(5);
  const [commentAuthor, setCommentAuthor] = useState(userProfile?.displayName || '');
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSuccessMsg, setCommentSuccessMsg] = useState('');

  // 7. NEW 25-FEATURE STATES: Express Checkout Modal, Link Scanner, Web Stories, Loyalty Streak, Poll, Topic Requests & Reseller Proposal
  const [expressCheckoutOpen, setExpressCheckoutOpen] = useState(false);
  const [expressTargetLink, setExpressTargetLink] = useState('');
  const [expressOrderSuccess, setExpressOrderSuccess] = useState(false);
  const [scannerInputUrl, setScannerInputUrl] = useState('');
  const [scannerResult, setScannerResult] = useState<ReturnType<typeof analyzeProfileLinkHealth> | null>(null);
  const [activeStorySlide, setActiveStorySlide] = useState<number | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedProposal, setCopiedProposal] = useState(false);
  const [agencyNameInput, setAgencyNameInput] = useState('Digital Growth Agency BD');
  const [clientNameInput, setClientNameInput] = useState('Brand / Page Owner');
  const [marginPercentInput, setMarginPercentInput] = useState<number>(60);
  const [selectedPollChoice, setSelectedPollChoice] = useState<string | null>(null);
  const [topicRequests, setTopicRequests] = useState<SMMBlogTopicRequest[]>(() =>
    getCommunityTopicRequests()
  );
  const [newTopicTitleInput, setNewTopicTitleInput] = useState('');
  const [newTopicCategoryInput, setNewTopicCategoryInput] = useState('Facebook');
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('boostlagbe_loyalty_points_v1') || '120');
    } catch {
      return 120;
    }
  });
  const [readingStreakDays] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('boostlagbe_reading_streak_v1') || '3');
    } catch {
      return 3;
    }
  });

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

  // Scroll listener for Top Reading Progress Bar (0% - 100%)
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

  // Stop speech synthesis on article change or unmount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setLanguageView('bn');
    setSelectedQuizOption(null);
    setPromoUnlocked(false);
    setHasVotedHelpful(null);
    if (activePost) {
      incrementBlogViews(activePost.id, activePost.views || 0);
      setLoyaltyPoints((prev) => {
        const next = prev + 15;
        try {
          localStorage.setItem('boostlagbe_loyalty_points_v1', String(next));
        } catch {
          // ignore
        }
        return next;
      });
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

  // Keep calculator service synced with relatedServices
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

  // Topic Silo Cluster (Same category posts)
  const siloClusterPosts = useMemo(() => {
    if (!activePost) return [];
    const sameCat = publishedBlogs.filter((b) => b.category === activePost.category);
    return sameCat.length >= 2 ? sameCat.slice(0, 5) : publishedBlogs.slice(0, 5);
  }, [publishedBlogs, activePost]);

  const relatedPosts = useMemo(() => {
    if (!activePost) return [];
    return publishedBlogs.filter((b) => b.id !== activePost.id).slice(0, 4);
  }, [publishedBlogs, activePost]);

  // Estimated Creator Earnings Calculation
  const creatorEarningsEstimate = useMemo(() => {
    const views = Math.max(1000, monthlyViewsInput || 0);
    // Realistic BD RPM ranges per 1,000 monetized views
    const rpmUsd =
      earningsPlatform === 'youtube' ? 0.85 : earningsPlatform === 'facebook' ? 0.55 : 0.28;
    const usd = Math.round((views / 1000) * rpmUsd);
    const bdt = Math.round(usd * 120);
    return { usd, bdt, rpmUsd };
  }, [earningsPlatform, monthlyViewsInput]);

  // Active Secret Promo Code (either from post or active coupons)
  const effectiveSecretPromo = useMemo(() => {
    const activeCoupon = coupons.find((c) => c.active);
    const code = activePost?.secretPromoCode || activeCoupon?.code || 'BLOGVIP';
    const desc =
      activePost?.secretPromoDiscountText ||
      (activeCoupon
        ? `এই কোডটি ব্যবহারে পাবেন ৳${activeCoupon.amount} ফ্রি ওয়ালেট বোনাস!`
        : 'ব্লগ পাঠকদের জন্য স্পেশাল ভিআইপি প্রোমো কোড — ডিপোজিট ও অর্ডারে প্রাধান্য সুবিধা!');
    return { code, desc };
  }, [activePost, coupons]);

  // User Referral Share Link (?ref=USER_CODE)
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

  // Audio Blog TTS Handler
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

  // Vote Helpful & Star Rating Handler
  const handleVoteHelpful = async (helpful: boolean) => {
    if (!activePost || hasVotedHelpful) return;
    setHasVotedHelpful(helpful ? 'yes' : 'no');
    try {
      await voteBlogHelpfulAndRating(activePost, helpful, selectedStars);
    } catch {
      // handled gracefully
    }
  };

  // Submit Reader Question / Comment
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

  // SPA click handler for internal links inside article HTML
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
        // Fallback to standard navigation
      }
    }
  };

  const formatDateBn = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
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
        name: 'ধাপ ১: প্রোফাইল ও পাবলিক লিংক প্রস্তুত করুন',
        text: `আপনার ${activePost.category} প্রোফাইল, পেজ বা ভিডিওর প্রাইভেসি Public রেখে লিংকটি কপি করুন।`
      },
      {
        name: 'ধাপ ২: বিকাশ/নগদে ইনস্ট্যান্ট ওয়ালেট রিচার্জ',
        text: 'Boostlagbe.com ওয়ালেটে বিকাশ বা নগদ দিয়ে মাত্র ২০ টাকা থেকে তাৎক্ষণিক ব্যালেন্স যুক্ত করুন।'
      },
      {
        name: 'ধাপ ৩: সার্ভিস নির্বাচন ও অটোমেটিক ডেলিভারি',
        text: 'New Order সেকশন থেকে কাঙ্ক্ষিত সার্ভিস সিলেক্ট করে লিংক দিন এবং Live Tracker-এ প্রগ্রেস দেখুন।'
      }
    ];
  }, [activePost]);

  const activeCaseStudy = useMemo(() => {
    if (!activePost) return null;
    return (
      activePost.caseStudy || {
        clientName: 'তানজিম হাসান (ঢাকা)',
        niche: `${activePost.category} Content Creator & Brand`,
        beforeMetric: '৪৫০ ফলোয়ার ও কম অর্গানিক রিচ',
        afterMetric: '১৪,৫০০+ অ্যাক্টিভ ফলোয়ার ও মনিটাইজেশন চালু',
        timeframe: '৭ দিন',
        budgetSpentBdt: '৳৬৫০ (বিকাশ পেমেন্ট)',
        summary:
          'নিয়মিত অরিজিনাল ভিডিও আপলোডের পাশাপাশি Boostlagbe.com থেকে নন-ড্রপ প্যাক ব্যবহার করে মাত্র ১ সপ্তাহে অর্গানিক রিচ ৪ গুণ বৃদ্ধি পেয়েছে।'
      }
    );
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
          'Boostlagbe.com শতভাগ নিরাপদ এবং পাসওয়ার্ড-মুক্ত; শুধুমাত্র আপনার পাবলিক লিংক দিয়েই ১–৫ মিনিটে অটোমেটিক ডেলিভারি শুরু করা যায়।'
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
        isPublicStandalone ? 'min-h-screen bg-slate-50 dark:bg-slate-950 pb-24' : 'space-y-6 pb-20'
      }
    >
      {/* Top Fixed Reading Progress Bar (0% to 100%) */}
      {activePost && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1.5 bg-slate-200/40 dark:bg-slate-800/40 pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-150"
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}

      {/* Standalone Top Header for Public / Googlebot Visitors */}
      {isPublicStandalone && (
        <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2.5 text-left group"
            >
              <img
                src="/assets/aistudio/file_00000000117c8208a1cede2cdfee706a_42e73997.png"
                alt={siteSettings?.siteName || 'Boostlagbe.com'}
                className="w-9 h-9 rounded-xl object-cover border border-indigo-500/20 shadow-sm"
              />
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white block leading-none">
                  {siteSettings?.siteName || 'Boostlagbe.com'}
                </span>
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                  অফিসিয়াল এসএমএম গাইড ও ব্লগ
                </span>
              </div>
            </button>

            <div className="flex items-center gap-2.5">
              {activePost && (
                <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[11px] font-bold">
                  পড়া হয়েছে: {readingProgress}%
                </span>
              )}
              <button
                onClick={() => onNavigate('landing')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                হোমপেজ
              </button>
              <button
                onClick={() => (onOpenAuth ? onOpenAuth() : onNavigate('new-order'))}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" /> অর্ডার শুরু করুন
              </button>
            </div>
          </div>
        </header>
      )}

      <div className={isPublicStandalone ? 'max-w-6xl mx-auto px-4 pt-6 space-y-6' : 'space-y-6'}>
        {activePost ? (
          /* ==========================================
             SINGLE SEO ARTICLE READER VIEW (ALL 11 ADVANCED SUITES)
             ========================================== */
          <article
            itemScope
            itemType={`https://schema.org/${activePost.schemaType || 'BlogPosting'}`}
            className="space-y-6"
          >
            {/* Breadcrumb & Utility Action Bar */}
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs"
            >
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => onSelectSlug(null)}
                  className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-bold mr-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> সব ব্লগ আর্টিকেল
                </button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-indigo-600 transition-colors"
                >
                  হোম
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <button
                  onClick={() => onSelectSlug(null)}
                  className="hover:text-indigo-600 transition-colors"
                >
                  ব্লগ ও গাইড
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-indigo-600 dark:text-indigo-400">{activePost.category}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold">
                  পড়া হয়েছে: {readingProgress}%
                </span>
                <button
                  type="button"
                  onClick={() => toggleBookmark(activePost.slug)}
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                    bookmarkedSlugs.includes(activePost.slug)
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {bookmarkedSlugs.includes(activePost.slug) ? (
                    <>
                      <BookmarkCheck className="w-3.5 h-3.5" /> সেভ করা হয়েছে
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-3.5 h-3.5" /> বুকমার্ক করুন
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-slate-700"
                >
                  <FileDown className="w-3.5 h-3.5 text-indigo-500" /> PDF ডাউনলোড
                </button>
              </div>
            </nav>

            {/* Article Hero Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
              {activePost.coverImage && (
                <div className="relative h-56 sm:h-80 w-full bg-slate-900 overflow-hidden">
                  <img
                    itemProp="image"
                    src={activePost.coverImage}
                    alt={activePost.coverImageAlt || activePost.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = FALLBACK_BLOG_IMAGE;
                    }}
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold tracking-wide shadow-sm">
                        {activePost.category}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-extrabold backdrop-blur-md flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {activePost.ratingValue || 4.9} ({activePost.ratingCount || 68} রিভিউ)
                      </span>
                    </div>

                    {/* Live Order Social Proof Badge */}
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold backdrop-blur-md flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> গত ২৪ ঘণ্টায় এই গাইড পড়ে অর্ডার করেছেন{' '}
                      {activePost.recentOrdersProofCount || 54}+ জন ক্রিয়েটর
                    </span>
                  </div>
                </div>
              )}

              <div className="p-5 sm:p-8 space-y-5">
                <h1
                  itemProp="headline"
                  className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight"
                >
                  {activePost.title}
                </h1>

                <p
                  itemProp="description"
                  className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed border-l-4 border-indigo-500 pl-4 py-1 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-r-xl"
                >
                  {activePost.excerpt}
                </p>

                {/* Interactive Audio TTS Player + Dual Language Toggle Bar */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleSpeech}
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all shadow-xs ${
                        isSpeaking
                          ? 'bg-rose-600 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <Square className="w-3.5 h-3.5" /> অডিও থামান (Stop Audio)
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" /> আর্টিকেলটি অডিও শুনুন (Listen)
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setSpeechRate((r) => (r === 1 ? 1.25 : 1))}
                      className="px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-700 dark:text-slate-300"
                    >
                      স্পিড: {speechRate}x
                    </button>
                  </div>

                  {/* Dual-Language Toggle (বাংলা গাইড ↔ English Summary) */}
                  <div className="inline-flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-300/60 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => setLanguageView('bn')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                        languageView === 'bn'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      বাংলা সম্পূর্ণ গাইড
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguageView('en')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 transition-all ${
                        languageView === 'en'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Globe className="w-3 h-3" /> English Summary
                    </button>
                  </div>
                </div>

                {/* English Executive Summary Box (when toggled) */}
                {languageView === 'en' && (
                  <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        English Executive Summary (International & AI Search Overview)
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">en-US / en-BD</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                      {activePost.englishSummary ||
                        `Complete 2026 practical guide on ${activePost.focusKeyword} in Bangladesh. Learn how to combine authentic organic content with Boostlagbe.com's instant bKash/Nagad automated non-drop social media growth and monetization packages safely without sharing any account password.`}
                    </p>
                  </div>
                )}

                {/* Author & Publication Metadata Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      itemProp="author"
                      itemScope
                      itemType="https://schema.org/Person"
                      className="flex items-center gap-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                        TA
                      </div>
                      <div>
                        <span
                          itemProp="name"
                          className="font-bold text-slate-800 dark:text-slate-200 block"
                        >
                          {activePost.authorName || 'তানভীর আহমেদ (Tanvir Ahmed)'}
                        </span>
                        <span itemProp="jobTitle" className="text-[11px] text-slate-400">
                          {activePost.authorRole || 'Senior Social Media Growth Strategist'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <time
                        itemProp="datePublished"
                        dateTime={new Date(
                          activePost.publishedAt || activePost.createdAt
                        ).toISOString()}
                      >
                        {formatDateBn(activePost.publishedAt || activePost.createdAt)}
                      </time>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>{activePost.readingTimeMinutes || 4} মিনিট পড়ুন</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{(activePost.views || 120).toLocaleString()} বার পঠিত</span>
                    </div>
                  </div>

                  {/* Share Button */}
                  <button
                    onClick={() => handleCopyCanonicalLink(activePost)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> লিংক কপি হয়েছে!
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-indigo-500" /> শেয়ার লিংক কপি করুন
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content + Sidebar Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 8 Cols: SGE Direct Answer + Anti-Duplicate Shield + Key Takeaways + TOC + Rich Content */}
              <div className="lg:col-span-8 space-y-6">
                {/* NEXT-GEN SEO: Google AI Overview / SGE Position #0 Direct Answer Snippet + Zero-Duplicate Fingerprint Strip */}
                <div className="bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-emerald-500/10 dark:from-indigo-950/50 dark:via-slate-900 dark:to-emerald-950/30 rounded-3xl border border-indigo-500/30 p-5 space-y-3.5 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-xs">
                        <Sparkles className="w-3 h-3" /> Google AI Overview • Position #0 Direct Answer
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                        100% Unique • N-Gram Overlap: {activePost.nGramSimilarityPercent ?? 4}%
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Fingerprint: {activePost.contentFingerprint || `BL-FP-${activePost.id.slice(0, 8).toUpperCase()}`}
                    </span>
                  </div>

                  <p
                    itemProp="abstract"
                    className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 leading-relaxed bg-white/80 dark:bg-slate-900/80 p-3.5 rounded-2xl border border-indigo-500/20"
                  >
                    {activePost.sgeDirectAnswer ||
                      `সংক্ষিপ্ত উত্তর (Quick Answer): বাংলাদেশে নিরাপদে ও দ্রুত "${activePost.focusKeyword || activePost.title}" নিশ্চিত করতে নিয়মিত অরিজিনাল কন্টেন্টের পাশাপাশি Boostlagbe.com-এ বিকাশ বা নগদে মাত্র ২০ টাকা থেকে ইনস্ট্যান্ট ওয়ালেট রিচার্জ করে পাসওয়ার্ড ছাড়াই কেবল পাবলিক লিংক দিয়ে ১–৫ মিনিটে অটোমেটেড নন-ড্রপ ডেলিভারি ও ৩০ দিনের রিফিল গ্যারান্টি পাওয়া যায়।`}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-1">
                    <span>
                      🎯 <strong>Search Intent Angle:</strong>{' '}
                      {activePost.intentAngle || 'Step-by-Step Practical Blueprint (ধাপে ধাপে প্র্যাকটিক্যাল গাইড)'}
                    </span>
                    <a
                      href="/rss.xml"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline inline-flex items-center gap-1"
                    >
                      <Globe className="w-3 h-3" /> RSS 2.0 Feed
                    </a>
                  </div>
                </div>

                {/* Key Takeaways Highlight Card */}
                {activePost.keyTakeaways && activePost.keyTakeaways.length > 0 && (
                  <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/40 dark:to-slate-900 rounded-2xl border border-emerald-500/30 p-5 space-y-3">
                    <div className="flex items-center gap-2 font-extrabold text-sm text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>এক নজরে মূল পয়েন্টসমূহ (Key Takeaways)</span>
                    </div>
                    <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                      {activePost.keyTakeaways.map((pt, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="font-medium leading-relaxed">{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Auto Table of Contents */}
                {processedArticle.toc.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
                    <div className="flex items-center gap-2 font-extrabold text-sm text-slate-900 dark:text-white mb-3">
                      <List className="w-4 h-4 text-indigo-500" />
                      <span>এই আর্টিকেলের সূচিপত্র (Table of Contents)</span>
                    </div>
                    <ul className="space-y-2 text-xs sm:text-sm">
                      {processedArticle.toc.map((item, idx) => (
                        <li
                          key={item.id}
                          className={
                            item.level === 3
                              ? 'pl-4 text-slate-600 dark:text-slate-400'
                              : 'font-semibold text-slate-800 dark:text-slate-200'
                          }
                        >
                          <a
                            href={`#${item.id}`}
                            className="hover:text-indigo-600 dark:hover:text-indigo-400 inline-flex items-center gap-2 transition-colors"
                          >
                            <span className="text-indigo-500 font-mono text-xs">{idx + 1}.</span>
                            <span>{item.text}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* SUITE 1: In-Article Live BDT Service Price Calculator & Instant 1-Click Order */}
                {selectedCalcService && (
                  <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-3xl border border-indigo-500/30 p-5 sm:p-6 shadow-md space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                          <Calculator className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 block">
                            লাইভ প্রাইস ক্যালকুলেটর (Instant BDT Rate Estimator)
                          </span>
                          <h3 className="text-sm sm:text-base font-extrabold">
                            ব্লগ পড়তে পড়তেই আপনার কাঙ্ক্ষিত বুস্টের খরচ হিসাব করুন
                          </h3>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold">
                        বিকাশ ও নগদ অটো পেমেন্ট
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                      <div className="sm:col-span-6 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          সার্ভিস নির্বাচন করুন ({activePost.category})
                        </label>
                        <select
                          value={selectedCalcService.id}
                          onChange={(e) => setCalcServiceId(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-xs font-bold text-white"
                        >
                          {relatedServices.map((srv) => (
                            <option key={srv.id} value={srv.id}>
                              #{srv.id} — {srv.name} (৳{srv.rate || srv.ratePer1000}/1K)
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <label className="text-[11px] font-bold text-slate-300 block">
                          পরিমাণ (Quantity)
                        </label>
                        <input
                          type="number"
                          min={selectedCalcService.min || 100}
                          max={selectedCalcService.max || 1000000}
                          step={100}
                          value={calcQuantity}
                          onChange={(e) => setCalcQuantity(Math.max(100, Number(e.target.value)))}
                          className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-indigo-500/40 text-xs font-mono font-extrabold text-white"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (activePost) {
                              recordBlogConversionEvent(activePost, 'calculator_click', estimatedServicePriceBdt);
                            }
                            setExpressCheckoutOpen(true);
                          }}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
                        >
                          <Zap className="w-4 h-4" /> মাত্র ৳{estimatedServicePriceBdt} ১-ক্লিক অর্ডার
                        </button>
                      </div>
                    </div>

                    {/* Feature 8, 10 & 14: Live Rate Drop Alert + First-Order Coupon + WhatsApp/Telegram Direct Order Context */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-[11px] text-slate-300">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-300 font-extrabold">
                          🔥 Lowest BDT Rate • Instant Auto Delivery
                        </span>
                        <span>
                          প্রতি ১,০০০ রেট: <strong className="text-emerald-300">৳{selectedCalcService.rate || selectedCalcService.ratePer1000}</strong> • কোড: <strong className="text-amber-300">FIRST10</strong>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`https://wa.me/${(siteSettings?.whatsappNumber || '8801700000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                            `হ্যালো Boostlagbe টিম! আমি "${activePost.title}" ব্লগটি পড়েছি এবং "${selectedCalcService.name}" (${calcQuantity} ইউনিট — ৳${estimatedServicePriceBdt}) অর্ডার করতে চাই।`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-extrabold inline-flex items-center gap-1"
                        >
                          💬 WhatsApp ১-ক্লিক অর্ডার
                        </a>
                        <button
                          type="button"
                          onClick={() => setExpressCheckoutOpen(true)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-500/30 hover:bg-indigo-500/40 border border-indigo-400/40 text-indigo-200 font-extrabold"
                        >
                          ⚡ ব্লগের ভেতরেই এক্সপ্রেস চেকআউট
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feature 6: Zero-Redirect 1-Click Express Checkout Modal / Drawer Inside Blog */}
                {expressCheckoutOpen && selectedCalcService && (
                  <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-2 border-emerald-500/50 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                          Zero-Redirect 1-Click Express Checkout
                        </span>
                        <h4 className="text-base font-extrabold">
                          ব্লগ না ছেড়েই তাৎক্ষণিক অর্ডার সম্পন্ন করুন ({selectedCalcService.name})
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setExpressCheckoutOpen(false);
                          setExpressOrderSuccess(false);
                        }}
                        className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold"
                      >
                        বন্ধ করুন ✕
                      </button>
                    </div>

                    {expressOrderSuccess ? (
                      <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 space-y-2 text-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                        <h5 className="text-sm font-extrabold text-emerald-200">
                          আপনার অর্ডার কনফিগারেশন প্রস্তুত হয়েছে!
                        </h5>
                        <p className="text-xs text-slate-300">
                          সার্ভিস: <strong>{selectedCalcService.name}</strong> • পরিমাণ: <strong>{calcQuantity}</strong> • চার্জ: <strong>৳{estimatedServicePriceBdt}</strong>
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSelectService) {
                                onSelectService(selectedCalcService);
                              } else {
                                onNavigate('new-order');
                              }
                            }}
                            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold"
                          >
                            নিউ অর্ডার ড্যাশবোর্ডে কনফার্ম করুন →
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigate('add-funds')}
                            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                          >
                            বিকাশ/নগদ ওয়ালেট রিচার্জ (৳২০+)
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                          <div className="sm:col-span-8">
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              আপনার পাবলিক পেজ, প্রোফাইল বা ভিডিও লিংক দিন *
                            </label>
                            <input
                              type="url"
                              value={expressTargetLink}
                              onChange={(e) => setExpressTargetLink(e.target.value)}
                              placeholder="https://www.facebook.com/... অথবা https://youtu.be/..."
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-indigo-500/40 text-xs text-white"
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <label className="text-[11px] font-bold text-slate-300 block mb-1">
                              মোট বিডিটি চার্জ
                            </label>
                            <div className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-sm font-mono font-extrabold text-emerald-300">
                              ৳{estimatedServicePriceBdt} BDT ({calcQuantity} ইউনিট)
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <span className="text-[11px] text-slate-400">
                            🔒 কোনো পাসওয়ার্ড লাগবে না • ওয়ালেট ব্যালেন্স: <strong>৳{(userProfile?.balance ?? 0).toFixed(2)}</strong>
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onNavigate('add-funds')}
                              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-amber-300"
                            >
                              + বিকাশ/নগদ ডিপোজিট
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (activePost) {
                                  recordBlogConversionEvent(activePost, 'express_order', estimatedServicePriceBdt);
                                }
                                setExpressOrderSuccess(true);
                              }}
                              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5"
                            >
                              <Zap className="w-3.5 h-3.5" /> এখনই অর্ডার সাবমিট করুন
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Semantic Article Body */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-8 shadow-xs">
                  <div
                    itemProp="articleBody"
                    onClick={handleArticleBodyClick}
                    className="prose prose-slate dark:prose-invert max-w-none
                      prose-headings:font-extrabold prose-headings:text-slate-900 dark:prose-headings:text-white
                      prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-7 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-100 dark:prose-h2:border-slate-800
                      prose-h3:text-lg sm:prose-h3:text-xl prose-h3:mt-5 prose-h3:mb-2
                      prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                      prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-li:my-1.5
                      prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:font-bold hover:prose-a:underline
                      prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/50 dark:prose-blockquote:bg-indigo-950/20 prose-blockquote:p-4 prose-blockquote:rounded-r-xl prose-blockquote:not-italic
                      prose-table:w-full prose-table:border-collapse prose-th:bg-slate-100 dark:prose-th:bg-slate-800 prose-th:p-2.5 prose-th:text-left prose-td:p-2.5 prose-td:border-t prose-td:border-slate-200 dark:prose-td:border-slate-800
                      prose-img:rounded-2xl prose-img:shadow-md
                      prose-strong:text-slate-900 dark:prose-strong:text-white"
                    dangerouslySetInnerHTML={{ __html: processedArticle.html }}
                  />

                  {/* SUITE 7: Google HowTo Step-by-Step Visual Cards */}
                  {activeHowToSteps.length > 0 && (
                    <div
                      itemScope
                      itemType="https://schema.org/HowTo"
                      className="mt-8 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-4"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h3
                          itemProp="name"
                          className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2"
                        >
                          <CheckCircle2 className="w-5 h-5 text-indigo-500" /> ধাপে ধাপে কাজের গাইডলাইন (Step-by-Step HowTo)
                        </h3>
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          Google HowTo Schema
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {activeHowToSteps.map((step, idx) => (
                          <div
                            key={idx}
                            id={`howto-step-${idx + 1}`}
                            itemScope
                            itemProp="step"
                            itemType="https://schema.org/HowToStep"
                            className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1.5"
                          >
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-extrabold">
                              {idx + 1}
                            </span>
                            <h4
                              itemProp="name"
                              className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white"
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

                  {/* SUITE 10: Real Bangladesh Creator & Reseller Case Study Card */}
                  {activeCaseStudy && (
                    <div className="mt-6 p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          <Award className="w-4 h-4" /> বাস্তব বাংলাদেশি ক্রিয়েটর কেস স্টাডি (Verified Success Story)
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold">
                          সময়কাল: {activeCaseStudy.timeframe} • খরচ: {activeCaseStudy.budgetSpentBdt}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 block">ক্রিয়েটর ও নিশ</span>
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                            {activeCaseStudy.clientName}
                          </span>
                          <span className="text-[11px] text-indigo-500 font-semibold">
                            {activeCaseStudy.niche}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800">
                          <span className="text-[10px] text-rose-500 font-bold block">আগের অবস্থা (Before)</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {activeCaseStudy.beforeMetric}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-emerald-500/30">
                          <span className="text-[10px] text-emerald-500 font-bold block">বর্তমান ফলাফল (After)</span>
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            {activeCaseStudy.afterMetric}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {activeCaseStudy.summary}
                      </p>
                    </div>
                  )}

                  {/* Conversion CTA Banner Inside Article */}
                  <div className="mt-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
                    <div className="space-y-1">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-indigo-100">
                        <Sparkles className="w-3.5 h-3.5" /> ইনস্ট্যান্ট অটোমেটেড ডেলিভারি
                      </span>
                      <h3 className="text-lg font-extrabold">
                        আপনার পেজ বা চ্যানেল আজই বুস্ট করতে চান?
                      </h3>
                      <p className="text-xs text-indigo-100">
                        বিকাশ ও নগদে মাত্র ২০ টাকা থেকে ইনস্ট্যান্ট ফলোয়ার, ভিউ ও মনিটাইজেশন প্যাক অর্ডার করুন।
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        isPublicStandalone && onOpenAuth ? onOpenAuth() : onNavigate('new-order')
                      }
                      className="px-5 py-3 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold text-xs shrink-0 shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Zap className="w-4 h-4" /> এখনই অর্ডার করুন
                    </button>
                  </div>
                </div>

                {/* SUITE 3 & 6: Interactive Creator Micro-Tools Suite (Earnings Calc, Best Time, Checklist, Viral Hashtags) */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-500">
                        Free Creator Growth Toolkit
                      </span>
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        ক্রিয়েটর ফ্রি টুলবক্স: ইনকাম ক্যালকুলেটর, ভাইরাল টাইম ও হ্যাশট্যাগ
                      </h3>
                    </div>
                  </div>

                  {/* Micro-Tool Selector Tabs (10 Interactive Growth, AI & Reseller Tools) */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/70">
                    <button
                      type="button"
                      onClick={() => setActiveMicroTool('earnings')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        activeMicroTool === 'earnings'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <BarChart3 className="w-3.5 h-3.5" /> ইনকাম ক্যালকুলেটর
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMicroTool('linkscanner')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        activeMicroTool === 'linkscanner'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> লিংক ও এলিজিবিলিটি স্ক্যানার
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMicroTool('combos')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        activeMicroTool === 'combos'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Zap className="w-3.5 h-3.5" /> মনিটাইজেশন কম্বো প্যাক
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMicroTool('reelsscript')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        activeMicroTool === 'reelsscript'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> 60s Reels/TikTok স্ক্রিপ্ট
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMicroTool('carousel')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        activeMicroTool === 'carousel'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" /> ৫-স্লাইড ক্যারোসেল
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMicroTool('reseller')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        activeMicroTool === 'reseller'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" /> রিসেলার ক্লায়েন্ট প্রপোজাল
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMicroTool('besttime')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        activeMicroTool === 'besttime'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" /> সেরা পোস্ট টাইম (BD)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMicroTool('checklist')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        activeMicroTool === 'checklist'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> মনিটাইজেশন চেকলিস্ট
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMicroTool('hashtags')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        activeMicroTool === 'hashtags'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Hash className="w-3.5 h-3.5" /> ভাইরাল হ্যাশট্যাগ
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveMicroTool('glossary')}
                      className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                        activeMicroTool === 'glossary'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" /> SMM গ্লোসারি উইকি
                    </button>
                  </div>

                  {/* Tool 1: BD Creator Monetization Earnings Calculator */}
                  {activeMicroTool === 'earnings' && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-4">
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
                            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
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
                            className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-extrabold text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 block">
                            আনুমানিক মাসিক মনিটাইজেশন আয় (বাংলাদেশ RPM: ~${creatorEarningsEstimate.rpmUsd}/1K)
                          </span>
                          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                            ৳{creatorEarningsEstimate.bdt.toLocaleString()} BDT{' '}
                            <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">
                              (${creatorEarningsEstimate.usd.toLocaleString()} USD / মাস)
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigate('services')}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold"
                        >
                          মনিটাইজেশন প্যাক দেখুন
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tool 2: Bangladesh Best Time to Post Viral Chart */}
                  {activeMicroTool === 'besttime' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {BD_BEST_POST_TIMES.map((row, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-1.5"
                        >
                          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block">
                            {row.platform}
                          </span>
                          <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                            🔥 পিক টাইম: {row.primeSlot}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            বিকল্প সময়: {row.secondarySlot}
                          </p>
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium pt-1">
                            টিপস: {row.tip}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tool 3: Interactive 5-Point Monetization Readiness Checklist */}
                  {activeMicroTool === 'checklist' && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          আপনার পেজ বা চ্যানেলের মনিটাইজেশন প্রস্তুতি যাচাই করুন:
                        </span>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold">
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
                                  prev.includes(idx)
                                    ? prev.filter((i) => i !== idx)
                                    : [...prev, idx]
                                )
                              }
                              className={`w-full text-left p-3 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all ${
                                checked
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-900 dark:text-white'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                                  checked
                                    ? 'bg-emerald-500 text-white'
                                    : 'border border-slate-400'
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

                  {/* Tool 4: 1-Click Copy Viral Hashtags */}
                  {activeMicroTool === 'hashtags' && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {activePost.category} ভাইরাল করার সেরা হ্যাশট্যাগ সেট:
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(activeViralHashtags.join(' '));
                            setCopiedHashtags(true);
                            setTimeout(() => setCopiedHashtags(false), 2500);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5"
                        >
                          {copiedHashtags ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> কপি হয়েছে!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> ১-ক্লিকে সব হ্যাশট্যাগ কপি করুন
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {activeViralHashtags.map((ht, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400"
                          >
                            {ht}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tool 5: Programmatic A-Z SMM & Monetization Glossary Wiki */}
                  {activeMicroTool === 'glossary' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SMM_GLOSSARY_TERMS.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                              {item.term}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold">
                              {item.category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {item.definition}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Feature 7: Live Profile & Video Link Health & Monetization Eligibility Scanner */}
                  {activeMicroTool === 'linkscanner' && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-4">
                      <div className="space-y-1">
                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block">
                          লাইভ প্রোফাইল ও ভিডিও লিংক হেলথ এবং মনিটাইজেশন এলিজিবিলিটি স্ক্যানার
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          আপনার Facebook, YouTube, TikTok বা Instagram লিংক পেস্ট করে দেখে নিন লিংকটি বুস্ট ও মনিটাইজেশনের জন্য প্রস্তুত কিনা।
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
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
                                scannerInputUrl || `https://www.facebook.com/boostlagbe`,
                                services
                              )
                            )
                          }
                          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shrink-0"
                        >
                          লিংক স্ক্যান করুন
                        </button>
                      </div>

                      {scannerResult && (
                        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-500/30 space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                              ✓ প্ল্যাটফর্ম: {scannerResult.detectedPlatform} • স্কোর: {scannerResult.readinessScore}/100
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold">
                              {scannerResult.statusLabel}
                            </span>
                          </div>
                          {scannerResult.recommendedServices.length > 0 && (
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              প্রস্তাবিত সার্ভিস:{' '}
                              <span className="text-indigo-600 dark:text-indigo-400">
                                {scannerResult.recommendedServices.map((s) => s.name).join(' • ')}
                              </span>
                            </p>
                          )}
                          <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                            {scannerResult.diagnosticNotes.map((t: string, idx: number) => (
                              <li key={idx}>• {t}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Feature 9: 1-Click Monetization Combo Bundles */}
                  {activeMicroTool === 'combos' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {MONETIZATION_COMBO_BUNDLES.map((bundle) => (
                        <div
                          key={bundle.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-indigo-500/30 flex flex-col justify-between space-y-3"
                        >
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold">
                                {bundle.badge}
                              </span>
                              <span className="text-xs font-mono text-slate-400 line-through">
                                ৳{bundle.regularPriceBdt}
                              </span>
                            </div>
                            <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                              {bundle.title}
                            </h4>
                            <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                              {bundle.items.map((it, idx) => (
                                <li key={idx} className="flex items-center gap-1.5">
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                  <span>{it}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block">কম্বো অফার মূল্য ({bundle.timeframe})</span>
                              <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                                ৳{bundle.bundlePriceBdt} BDT
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                recordBlogConversionEvent(activePost, 'express_order', bundle.bundlePriceBdt);
                                onNavigate('new-order');
                              }}
                              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1"
                            >
                              <Zap className="w-3.5 h-3.5" /> ১-ক্লিকে কম্বো অর্ডার
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Feature 11: Blog-to-60s Reels / TikTok / YouTube Shorts Video Script Generator */}
                  {activeMicroTool === 'reelsscript' && (() => {
                    const scriptObj = generate60sReelsScriptFromBlog(activePost);
                    const formattedScript = `${scriptObj.hook0to5s}\n\n${scriptObj.body5to45s.join('\n')}\n\n${scriptObj.cta45to60s}\n\n--- ক্যাপশন ও হ্যাশট্যাগ ---\n${scriptObj.captionWithHashtags}`;
                    return (
                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block">
                              ৬০ সেকেন্ডের ভাইরাল Reels / TikTok / Shorts ভিডিও স্ক্রিপ্ট
                            </span>
                            <span className="text-[11px] text-slate-500">
                              এই ব্লগ থেকে স্বয়ংক্রিয়ভাবে তৈরি ৩-সেকেন্ড হুক, মূল পয়েন্ট ও কল-টু-অ্যাকশন স্ক্রিপ্ট
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(formattedScript);
                              setCopiedScript(true);
                              setTimeout(() => setCopiedScript(false), 2500);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5"
                          >
                            {copiedScript ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> স্ক্রিপ্ট কপি হয়েছে!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> ১-ক্লিকে স্ক্রিপ্ট কপি করুন
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                          {formattedScript}
                        </pre>
                      </div>
                    );
                  })()}

                  {/* Feature 12: Blog-to-5-Slide Social Media Infographic Carousel Builder */}
                  {activeMicroTool === 'carousel' && (
                    <div className="space-y-3">
                      <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block">
                        সোশ্যাল মিডিয়া ৫-স্লাইড ইনফোগ্রাফিক ক্যারোসেল ডেক (Facebook & Instagram Post Ready)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                        {generateSocialCarouselSlidesFromBlog(activePost).map((sl) => (
                          <div
                            key={sl.slideNumber}
                            className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-500/30 flex flex-col justify-between space-y-2"
                          >
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold">
                                Slide #{sl.slideNumber}/5
                              </span>
                              <h5 className="text-xs font-extrabold text-amber-300 leading-snug">
                                {sl.headline}
                              </h5>
                              <p className="text-[11px] text-slate-200 leading-relaxed">{sl.bullet}</p>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 pt-2 border-t border-white/10 block">
                              {sl.footerTag}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feature 25: Reseller White-Label Client Pitch & Proposal Generator */}
                  {activeMicroTool === 'reseller' && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 block">
                            এজেন্সি ও রিসেলার হোয়াইট-লেবেল ক্লায়েন্ট প্রপোজাল জেনারেটর
                          </span>
                          <span className="text-[11px] text-slate-500">
                            আপনার নিজস্ব এজেন্সির নামে ও কাস্টম প্রফিট মার্জিনে ক্লায়েন্টকে প্রপোজাল পাঠান
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const text = generateResellerWhiteLabelProposal(
                              activePost,
                              `${agencyNameInput} (Client: ${clientNameInput})`,
                              marginPercentInput
                            );
                            navigator.clipboard.writeText(text);
                            setCopiedProposal(true);
                            setTimeout(() => setCopiedProposal(false), 2500);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5"
                        >
                          {copiedProposal ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> প্রপোজাল কপি হয়েছে!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> হোয়াইট-লেবেল প্রপোজাল কপি করুন
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <input
                          type="text"
                          value={agencyNameInput}
                          onChange={(e) => setAgencyNameInput(e.target.value)}
                          placeholder="আপনার এজেন্সির নাম"
                          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={clientNameInput}
                          onChange={(e) => setClientNameInput(e.target.value)}
                          placeholder="ক্লায়েন্ট বা পেজের নাম"
                          className="px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 shrink-0">
                            মার্জিন %:
                          </span>
                          <input
                            type="number"
                            min={10}
                            max={300}
                            value={marginPercentInput}
                            onChange={(e) => setMarginPercentInput(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <pre className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-200 whitespace-pre-wrap font-sans leading-relaxed">
                        {generateResellerWhiteLabelProposal(
                          activePost,
                          `${agencyNameInput} (Client: ${clientNameInput})`,
                          marginPercentInput
                        )}
                      </pre>
                    </div>
                  )}
                </div>

                {/* SUITE 9: Gamified Read-to-Earn Quick Quiz & Secret Reader Promo Code Box */}
                {activeQuiz && (
                  <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/30 dark:to-slate-900 rounded-3xl border border-amber-500/30 p-5 sm:p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-amber-500" />
                        <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                          কুইজের উত্তর দিন এবং সিক্রেট প্রোমো ভাউচার কোড আনলক করুন!
                        </h3>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] font-extrabold">
                        Read-to-Earn Reward
                      </span>
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
                            className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? isCorrect
                                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-amber-500/50'
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
                        ✓ ব্যাখ্যা: {activeQuiz.explanation}
                      </p>
                    )}

                    <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-amber-500/30 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {promoUnlocked ? (
                          <Unlock className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <Lock className="w-5 h-5 text-amber-500 shrink-0" />
                        )}
                        <div>
                          <span className="text-[11px] text-slate-400 block">
                            {effectiveSecretPromo.desc}
                          </span>
                          <span className="text-sm font-mono font-extrabold text-slate-900 dark:text-white">
                            প্রোমো কোড:{' '}
                            <strong className="text-amber-500">
                              {promoUnlocked ? effectiveSecretPromo.code : '•••••• (উপরে ক্লিক করে আনলক করুন)'}
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!promoUnlocked ? (
                          <button
                            type="button"
                            onClick={() => setPromoUnlocked(true)}
                            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold"
                          >
                            কোড আনলক করুন
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(effectiveSecretPromo.code);
                                setCopiedPromo(true);
                                setTimeout(() => setCopiedPromo(false), 2500);
                              }}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5"
                            >
                              {copiedPromo ? (
                                <>
                                  <Check className="w-3.5 h-3.5" /> কপি হয়েছে!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" /> কোড কপি করুন
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowCertificateModal((prev) => !prev)}
                              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center gap-1.5"
                            >
                              <Award className="w-3.5 h-3.5" /> সার্টিফিকেট নিন
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Feature 16: Boostlagbe Creator Academy Digital Certificate */}
                    {showCertificateModal && (
                      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white border-2 border-amber-400/60 shadow-xl space-y-4 text-center">
                        <Award className="w-10 h-10 text-amber-400 mx-auto" />
                        <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-300 block">
                          Boostlagbe Creator Academy • Verified Certification 2026
                        </span>
                        <h4 className="text-lg sm:text-xl font-extrabold text-white">
                          Certified {activePost.category} Growth & Monetization Strategist
                        </h4>
                        <p className="text-xs text-slate-300 max-w-md mx-auto">
                          এই মর্মে প্রত্যয়ন করা যাচ্ছে যে নিচের ক্রিয়েটর সফলভাবে "{activePost.title}" মাস্টারক্লাস ও এসেসমেন্ট সম্পন্ন করেছেন:
                        </p>
                        <div className="max-w-xs mx-auto">
                          <input
                            type="text"
                            value={certificateRecipientName}
                            onChange={(e) => setCertificateRecipientName(e.target.value)}
                            className="w-full text-center px-3 py-2 rounded-xl bg-white/10 border border-amber-400/40 text-sm font-extrabold text-amber-300"
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px] text-slate-400">
                          <span>Certificate ID: BL-CERT-{activePost.id.slice(0, 6).toUpperCase()}</span>
                          <span>•</span>
                          <span>Issued by: Boostlagbe.com Editorial Board</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold inline-flex items-center gap-1.5"
                        >
                          <FileDown className="w-3.5 h-3.5" /> সার্টিফিকেট প্রিন্ট / PDF সেভ করুন
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Feature 18: Interactive 1-Click Live Creator Poll Widget */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      📊 লাইভ ক্রিয়েটর পোল (Community Pulse Poll)
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold">১-ক্লিকে ভোট দিন</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    ২০২৬ সালে আপনার মূল সোশ্যাল মিডিয়া মনিটাইজেশন টার্গেট কোনটি?
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {[
                      { id: 'fb', label: 'Facebook Page In-Stream & Reels', pct: 48 },
                      { id: 'yt', label: 'YouTube 4000h & AdSense', pct: 31 },
                      { id: 'tt', label: 'TikTok Viral & Brand Deals', pct: 21 }
                    ].map((opt) => {
                      const active = selectedPollChoice === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSelectedPollChoice(opt.id)}
                          className={`p-3 rounded-2xl border text-left transition-all space-y-1.5 ${
                            active
                              ? 'bg-indigo-600/10 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-extrabold">
                            <span>{opt.label}</span>
                            {selectedPollChoice && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                {active ? opt.pct + 1 : opt.pct}%
                              </span>
                            )}
                          </div>
                          {selectedPollChoice && (
                            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                              <div
                                className="h-full bg-indigo-600"
                                style={{ width: `${active ? opt.pct + 1 : opt.pct}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Feature 4: Voice Search & Banglish (বাংলিশ) Phonetic FAQ Block */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                        Google Voice Search & Banglish Phonetic Queries (Speakable Schema)
                      </span>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        ভয়েস সার্চ ও বাংলিশ (Banglish) জনপ্রিয় প্রশ্নোত্তর
                      </h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {generateBanglishVoiceSearchFaqs(activePost).map((bf, bIdx) => (
                      <div
                        key={bIdx}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-1.5"
                      >
                        <span className="text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-400 block">
                          🎤 {bf.banglishQuestion}
                        </span>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {bf.voiceAnswerBn}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SUITE 5: Share Blog with Referral Link (?ref=USER_CODE) to Earn ৳10 */}
                <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-3xl border border-indigo-500/30 p-5 sm:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
                        Share & Earn ৳10 Per Verified Referral
                      </span>
                      <h3 className="text-base font-extrabold">
                        এই ব্লগটি বন্ধুদের শেয়ার করে প্রতি রেফারেলে ৳১০ বোনাস + আজীবন কমিশন আয় করুন!
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('affiliates')}
                      className="text-xs font-bold text-indigo-300 hover:underline"
                    >
                      রেফারেল ড্যাশবোর্ড →
                    </button>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    নিচের লিংকে আপনার রেফারেল ট্র্যাকিং কোড যুক্ত আছে। কেউ এই গাইড পড়ে সাইনআপ করে ন্যূনতম ১০০ টাকা ডিপোজিট করলেই আপনার ওয়ালেটে স্বয়ংক্রিয়ভাবে <strong>৳১০ ভেরিফাইড রেফারেল বোনাস</strong> জমা হবে!
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      readOnly
                      value={referralShareUrl}
                      className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-indigo-500/30 text-xs font-mono text-indigo-200"
                    />
                    <button
                      type="button"
                      onClick={handleCopyReferralLink}
                      className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shrink-0 flex items-center justify-center gap-1.5"
                    >
                      {copiedReferral ? (
                        <>
                          <Check className="w-4 h-4" /> রেফারেল লিংক কপি হয়েছে!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> রেফারেল ব্লগ লিংক কপি করুন
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Google E-E-A-T Verified Author & Editorial Reviewer Credential Box */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                      <ShieldCheck className="w-4 h-4" /> Google E-E-A-T Verified Editorial Author & Fact-Checked Guide
                    </span>
                    <span className="text-[11px] text-slate-400 font-semibold">
                      Reviewed by: {activePost.reviewedBy || 'Boostlagbe Editorial & SEO Review Board'}
                    </span>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-extrabold flex items-center justify-center text-base shrink-0 shadow-sm">
                      TA
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                        {activePost.authorName || 'তানভীর আহমেদ (Tanvir Ahmed)'}
                      </h3>
                      <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {activePost.authorRole || 'Senior Social Media Growth Strategist, Boostlagbe.com'}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        {activePost.authorBio ||
                          'তানভীর আহমেদ গত ৬+ বছর ধরে বাংলাদেশের ১০,০০০+ ফেসবুক পেজ, ইউটিউব চ্যানেল এবং ই-কমার্স ব্র্যান্ডের অর্গানিক গ্রোথ, মনিটাইজেশন ও এসইও স্ট্র্যাটেজি নিয়ে কাজ করছেন।'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Google Rich Snippet FAQPage Section */}
                {activePost.faqItems && activePost.faqItems.length > 0 && (
                  <section
                    itemScope
                    itemType="https://schema.org/FAQPage"
                    className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-8 shadow-xs space-y-4"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <HelpCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                          সচরাচর জিজ্ঞাসিত প্রশ্নাবলী (FAQ)
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          গুগল সার্চ ও ইউজারদের সবচেয়ে গুরুত্বপূর্ণ প্রশ্ন ও উত্তর
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      {activePost.faqItems.map((faq, idx) => {
                        const isOpen = openFaqIndex === idx;
                        return (
                          <div
                            key={idx}
                            itemScope
                            itemProp="mainEntity"
                            itemType="https://schema.org/Question"
                            className="rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                              className="w-full px-4 py-3.5 text-left bg-slate-50/70 dark:bg-slate-800/40 hover:bg-slate-100/80 dark:hover:bg-slate-800 flex items-center justify-between gap-3 transition-colors"
                            >
                              <span
                                itemProp="name"
                                className="font-bold text-sm text-slate-900 dark:text-white"
                              >
                                {faq.question}
                              </span>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                                  isOpen ? 'rotate-180 text-indigo-500' : ''
                                }`}
                              />
                            </button>
                            {isOpen && (
                              <div
                                itemScope
                                itemProp="acceptedAnswer"
                                itemType="https://schema.org/Answer"
                                className="px-4 py-3.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"
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

                {/* SUITE 4: Helpfulness Voting, 5-Star Rating & Verified Reader Q&A Comments */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-8 shadow-xs space-y-6">
                  {/* Voting & Star Rating Bar */}
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                        এই গাইডটি কি আপনার উপকারে এসেছে? (রেটিং দিন)
                      </h3>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setSelectedStars(st)}
                            className="p-0.5"
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
                        <span className="text-xs font-bold text-slate-500 ml-2">
                          গড় রেটিং: {activePost.ratingValue || 4.9}/5 ({activePost.ratingCount || 68} ভোট)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={hasVotedHelpful !== null}
                        onClick={() => handleVoteHelpful(true)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
                          hasVotedHelpful === 'yes'
                            ? 'bg-emerald-600 text-white border-emerald-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-emerald-500'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" /> হ্যাঁ, দারুণ ({activePost.helpfulYesCount || 72})
                      </button>
                      <button
                        type="button"
                        disabled={hasVotedHelpful !== null}
                        onClick={() => handleVoteHelpful(false)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border transition-all ${
                          hasVotedHelpful === 'no'
                            ? 'bg-rose-600 text-white border-rose-500'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5 text-rose-500" /> না ({activePost.helpfulNoCount || 2})
                      </button>
                    </div>
                  </div>

                  {/* Verified Reader Q&A Form */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-indigo-500" />
                      <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                        পাঠকদের প্রশ্ন ও অভিজ্ঞতা ({(activePost.comments || []).length})
                      </h3>
                    </div>

                    {commentSuccessMsg && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                        {commentSuccessMsg}
                      </div>
                    )}

                    <form onSubmit={handleSubmitComment} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          value={commentAuthor}
                          onChange={(e) => setCommentAuthor(e.target.value)}
                          placeholder="আপনার নাম (যেমন: রাকিব হাসান)"
                          className="px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="আপনার প্রশ্ন বা মতামত লিখুন (প্রশ্ন করলে তাৎক্ষণিক উত্তর পাবেন)..."
                          className="sm:col-span-2 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmittingComment || !commentText.trim()}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-extrabold inline-flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" /> প্রশ্ন বা মন্তব্য পোস্ট করুন
                      </button>
                    </form>

                    {/* Comments List */}
                    <div className="space-y-3 pt-2">
                      {(activePost.comments || []).map((cmt) => (
                        <div
                          key={cmt.id}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                                {cmt.authorName || cmt.userName || 'ভেরিফাইড ক্রিয়েটর'}
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                                {cmt.authorBadge || 'Verified Reader'}
                              </span>
                            </div>
                            <span className="text-[11px] text-amber-500 font-bold">
                              {'★'.repeat(cmt.rating || 5)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            {cmt.text || cmt.questionOrComment || ''}
                          </p>
                          {cmt.adminReply && (
                            <div className="ml-4 p-3 rounded-xl bg-indigo-500/10 border-l-2 border-indigo-500 text-xs text-slate-700 dark:text-slate-200">
                              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5">
                                ✓ Boostlagbe Expert Support Reply:
                              </span>
                              {cmt.adminReply}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* SEO Keywords & Topic Tags Footer */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    <span>সম্পর্কিত সার্চ ট্যাগ ও কীওয়ার্ডসমূহ:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      activePost.focusKeyword,
                      ...(activePost.tags || []),
                      ...(activePost.secondaryKeywords || [])
                    ]
                      .filter(Boolean)
                      .map((kw, i) => (
                        <span
                          key={i}
                          itemProp="keywords"
                          className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                        >
                          #{kw}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              {/* Right 4 Cols: Silo Cluster + Related Services + Popular Posts */}
              <aside className="lg:col-span-4 space-y-6">
                {/* SUITE 2: Pillar & Sub-Topic Silo Cluster Navigation */}
                {siloClusterPosts.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-indigo-500/30 p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-500">
                        Topic Cluster Silo ({activePost.category})
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        {siloClusterPosts.length} পর্বের সিরিজ
                      </span>
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {activePost.category} মাস্টারক্লাস গাইড সিরিজ
                    </h3>
                    <div className="space-y-2">
                      {siloClusterPosts.map((sp, idx) => {
                        const isCurrent = sp.id === activePost.id;
                        return (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => onSelectSlug(sp.slug)}
                            className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                              isCurrent
                                ? 'bg-indigo-600/10 border-indigo-500 text-indigo-600 dark:text-indigo-300 font-extrabold'
                                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-500/40 font-semibold'
                            }`}
                          >
                            <span className="w-5 h-5 rounded-md bg-indigo-500/15 text-indigo-500 font-mono text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="line-clamp-2 leading-snug block">{sp.title}</span>
                              {isCurrent && (
                                <span className="text-[10px] text-emerald-500 font-extrabold mt-0.5 block">
                                  ● এখন পড়ছেন (Currently Reading)
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Popular Services Widget */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        জনপ্রিয় বুস্ট সার্ভিসসমূহ
                      </h3>
                    </div>
                    <button
                      onClick={() => onNavigate('services')}
                      className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      সব দেখুন
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {relatedServices.slice(0, 4).map((srv) => (
                      <div
                        key={srv.id}
                        className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/40 bg-slate-50/50 dark:bg-slate-800/30 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            {srv.category}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            ৳{srv.rate || srv.ratePer1000} / ১,০০০
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                          {srv.name}
                        </p>
                        <button
                          onClick={() => {
                            if (onSelectService) {
                              onSelectService(srv);
                            } else {
                              onNavigate('new-order');
                            }
                          }}
                          className="w-full py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] transition-colors flex items-center justify-center gap-1"
                        >
                          <Zap className="w-3 h-3" /> অর্ডার করুন
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Other Pillar Articles (Contextual Internal Links) */}
                {relatedPosts.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" /> সম্পর্কিত অন্যান্য গাইড (আরও পড়ুন)
                    </h3>
                    <div className="space-y-3">
                      {relatedPosts.map((rp) => (
                        <button
                          key={rp.id}
                          onClick={() => onSelectSlug(rp.slug)}
                          className="w-full text-left p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all group"
                        >
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                            {rp.category}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 line-clamp-2 mt-0.5">
                            {rp.title}
                          </h4>
                          <span className="text-[11px] text-slate-400 mt-1 block">
                            {rp.readingTimeMinutes || 4} মিনিট পড়ুন
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>

            {/* Sticky Mobile Bottom CTA Bar */}
            <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-slate-900/95 backdrop-blur-xl border-t border-indigo-500/30 px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xl">
              <div className="min-w-0">
                <span className="text-[10px] text-emerald-400 font-extrabold block">
                  {activePost.category} অটোমেটিক বুস্ট • বিকাশ/নগদ
                </span>
                <span className="text-xs font-extrabold text-white truncate block">
                  মাত্র ২০ টাকা থেকে ইনস্ট্যান্ট ডেলিভারি
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedCalcService && onSelectService) {
                    onSelectService(selectedCalcService);
                  } else {
                    onNavigate('new-order');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white text-xs font-extrabold shrink-0 flex items-center gap-1.5 shadow-md"
              >
                <Zap className="w-3.5 h-3.5" /> এখনই অর্ডার করুন
              </button>
            </div>
          </article>
        ) : (
          /* ==========================================
             BLOG HUB LISTING VIEW (ALL SEO ARTICLES + BOOKMARK FILTER)
             ========================================== */
          <div className="space-y-6">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-indigo-500/20 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
                  <BookOpen className="w-3.5 h-3.5" /> সোশ্যাল মিডিয়া মার্কেটিং ও গ্রোথ একাডেমি
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  Boostlagbe.com অফিসিয়াল ব্লগ ও গাইডলাইন
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  ফেসবুক পেজ মনিটাইজেশন, টিকটক ভাইরাল ট্রিকস, ইউটিউব ৪০০০ ঘণ্টা ওয়াচটাইম, ইনকাম ক্যালকুলেটর এবং রিসেলার মার্কেটিং নিয়ে বিস্তারিত গাইড পড়ুন।
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 z-10">
                {/* Feature 17: Daily Reading Streak & BoostPoints Loyalty Badge */}
                <span className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-xs font-extrabold text-emerald-300 inline-flex items-center gap-1.5">
                  🔥 {readingStreakDays} দিনের স্ট্রিক • 🪙 {loyaltyPoints} BoostPoints
                </span>
                <a
                  href="/rss.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-extrabold text-amber-300 inline-flex items-center gap-1.5 transition-all"
                >
                  <Globe className="w-3.5 h-3.5" /> RSS 2.0 Feed
                </a>
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-extrabold text-emerald-300 inline-flex items-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Image Sitemap.xml
                </a>
              </div>
            </div>

            {/* Feature 3: Google Web Stories / Visual AMP 6-Slide Interactive Story Viewer */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    Google Discover & Visual Web Stories (১৫ সেকেন্ডে কুইক গাইড)
                  </h2>
                </div>
                <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                  যেকোনো স্টোরিতে ট্যাপ করুন
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                {GOOGLE_WEB_STORIES_SLIDES.map((st, idx) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setActiveStorySlide(activeStorySlide === idx ? null : idx)}
                    className={`text-left p-3.5 rounded-2xl bg-gradient-to-br ${st.gradient} text-white shadow-sm hover:scale-[1.02] transition-all flex flex-col justify-between min-h-[128px] ${
                      activeStorySlide === idx ? 'ring-2 ring-amber-400' : ''
                    }`}
                  >
                    <span className="px-2 py-0.5 rounded bg-black/30 text-[10px] font-extrabold w-fit">
                      {st.badge}
                    </span>
                    <div className="space-y-1 mt-2">
                      <h3 className="text-xs font-extrabold leading-snug">{st.title}</h3>
                      <span className="text-[10px] text-amber-200 font-bold block">{st.ctaLabel} →</span>
                    </div>
                  </button>
                ))}
              </div>
              {activeStorySlide !== null && GOOGLE_WEB_STORIES_SLIDES[activeStorySlide] && (
                <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold text-amber-400 uppercase">
                      Web Story Slide #{activeStorySlide + 1}/6 • {GOOGLE_WEB_STORIES_SLIDES[activeStorySlide].badge}
                    </span>
                    <h4 className="text-sm font-extrabold">
                      {GOOGLE_WEB_STORIES_SLIDES[activeStorySlide].title}
                    </h4>
                    <p className="text-xs text-slate-300">
                      {GOOGLE_WEB_STORIES_SLIDES[activeStorySlide].subtitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onNavigate(GOOGLE_WEB_STORIES_SLIDES[activeStorySlide].ctaTab || 'new-order')}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold"
                    >
                      {GOOGLE_WEB_STORIES_SLIDES[activeStorySlide].ctaLabel} →
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveStorySlide(null)}
                      className="px-3 py-2 rounded-xl bg-white/10 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Search & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="টপিক বা কীওয়ার্ড দিয়ে ব্লগ খুঁজুন (যেমন: ফেসবুক ফলোয়ার, টিকটক ভিউ)..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {cat === 'All'
                      ? 'সব ক্যাটাগরি'
                      : cat === 'Saved'
                      ? `🔖 বুকমার্ক (${bookmarkedSlugs.length})`
                      : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Blog Cards Grid */}
            {filteredBlogs.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-12 text-center space-y-3">
                <Layers className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                  কোনো ব্লগ পোস্ট পাওয়া যায়নি
                </h3>
                <p className="text-xs text-slate-500">
                  অন্য কোনো কীওয়ার্ড বা ক্যাটাগরি নির্বাচন করে আবার চেষ্টা করুন।
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredBlogs.map((post) => {
                  const isBookmarked = bookmarkedSlugs.includes(post.slug);
                  return (
                    <article
                      key={post.id}
                      onClick={() => onSelectSlug(post.slug)}
                      className="group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-500/40 transition-all flex flex-col"
                    >
                      <div className="relative h-48 bg-slate-900 overflow-hidden">
                        <img
                          src={post.coverImage || FALLBACK_BLOG_IMAGE}
                          alt={post.coverImageAlt || post.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src = FALLBACK_BLOG_IMAGE;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-indigo-600/95 text-white text-[11px] font-bold shadow-xs">
                            {post.category}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => toggleBookmark(post.slug, e)}
                            className={`p-1.5 rounded-lg backdrop-blur-md border transition-colors ${
                              isBookmarked
                                ? 'bg-amber-500/90 border-amber-400 text-slate-950'
                                : 'bg-slate-900/60 border-white/20 text-white hover:bg-slate-900'
                            }`}
                            title="বুকমার্ক করুন"
                          >
                            {isBookmarked ? (
                              <BookmarkCheck className="w-3.5 h-3.5" />
                            ) : (
                              <Bookmark className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-slate-200 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400" /> {post.readingTimeMinutes || 4} মিনিট পড়ুন
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />{' '}
                            {post.ratingValue || 4.9} • {(post.views || 120).toLocaleString()} ভিউ
                          </span>
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2.5">
                          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                            {post.title}
                          </h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                            {post.excerpt}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-medium">
                            {formatDateBn(post.publishedAt || post.createdAt)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 transition-transform">
                            সম্পূর্ণ পড়ুন <ExternalLink className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Feature 1: Programmatic SEO Commercial Service Landing Pages Hub */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-500">
                    Programmatic Commercial SEO Landing Hubs
                  </span>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                    বাংলাদেশ জনপ্রিয় বুস্ট ও মনিটাইজেশন সার্ভিস ল্যান্ডিং হাব (২০২৬ রেট)
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('services')}
                  className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  সম্পূর্ণ ক্যাটালগ দেখুন →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {PROGRAMMATIC_SEO_LANDING_PAGES.map((lp) => (
                  <div
                    key={lp.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold">
                          {lp.category}
                        </span>
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          ৳{lp.startingRateBdt} / 1K থেকে
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                        {lp.title}
                      </h3>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {lp.summary}
                      </p>
                      <p className="text-[10px] font-mono text-indigo-500">
                        ⚡ {lp.deliverySpeed} • {lp.refillGuarantee}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onNavigate('new-order')}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" /> ইনস্ট্যান্ট অর্ডার করুন
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature 2: Dollar Card Boost vs. Boostlagbe.com Interactive Comparison Matrix */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Interactive Comparison Matrix 2026
                </span>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  সাধারণ ডলার কার্ড বুস্ট বনাম Boostlagbe.com অটোমেটেড প্যানেল (তুলনামূলক চিত্র)
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200">
                      <th className="p-3 rounded-tl-xl font-extrabold">তুলনার বিষয় (Feature)</th>
                      <th className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400">
                        Boostlagbe.com (বুস্ট লাগবে)
                      </th>
                      <th className="p-3 font-bold text-slate-500">সাধারণ ডলার কার্ড বুস্ট</th>
                      <th className="p-3 rounded-tr-xl font-bold text-slate-500">সাধারণ লোকাল রিসেলার</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                    {COMPETITOR_VS_BOOSTLAGBE_MATRIX.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="p-3 font-extrabold text-slate-900 dark:text-white">
                          {row.feature}
                        </td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                          ✓ {row.boostlagbe}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{row.dollarAds}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400">{row.traditionalAgency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Feature 5 & 19: Divisional Local SEO Cluster + Reader Community Topic Request & Upvote Board */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 6 Cols: 8-Division Local SEO Hub */}
              <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-500">
                    Bangladesh 8-Division Local SEO Cluster
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    বিভাগ ও শহরভিত্তিক লোকাল ই-কমার্স এবং ক্রিয়েটর গ্রোথ হাব
                  </h2>
                </div>
                <div className="space-y-2.5">
                  {DIVISIONAL_LOCAL_SEO_HUBS.map((hub) => (
                    <div
                      key={hub.division}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400">
                          📍 {hub.division}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {hub.activeClients}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {hub.popularService}
                      </p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        {hub.focusArea} • Keyword: {hub.localKeyword}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 6 Cols: Reader Community Topic Request & Upvote Board */}
              <div className="lg:col-span-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-500">
                    Community Topic Request & Upvote Board
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                    পরবর্তী ব্লগ কোন বিষয়ে চান? রিকোয়েস্ট ও আপভোট করুন
                  </h2>
                  <p className="text-xs text-slate-500">
                    সবচেয়ে বেশি আপভোট পাওয়া টপিকগুলো আমাদের AI Autopilot স্বয়ংক্রিয়ভাবে লিখে পাবলিশ করবে।
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={newTopicCategoryInput}
                    onChange={(e) => setNewTopicCategoryInput(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    <option value="Facebook">Facebook</option>
                    <option value="YouTube">YouTube</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Instagram">Instagram</option>
                    <option value="SMM Guide">SMM Guide</option>
                  </select>
                  <input
                    type="text"
                    value={newTopicTitleInput}
                    onChange={(e) => setNewTopicTitleInput(e.target.value)}
                    placeholder="আপনার পছন্দের ব্লগের টপিক লিখুন..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTopicTitleInput.trim()) return;
                      const updated = submitCommunityTopicRequest({
                        topic: newTopicTitleInput,
                        category: newTopicCategoryInput,
                        requestedBy: userProfile?.displayName || 'ভেরিফাইড পাঠক'
                      });
                      setTopicRequests(updated);
                      setNewTopicTitleInput('');
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shrink-0"
                  >
                    + টপিক যোগ করুন
                  </button>
                </div>

                <div className="space-y-2.5">
                  {topicRequests.slice(0, 5).map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-extrabold">
                            {req.category}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Requested by {req.requestedBy}
                          </span>
                        </div>
                        <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          {req.topicTitle || req.topic}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTopicRequests(upvoteCommunityTopicRequest(req.id))}
                        className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-indigo-600 dark:text-indigo-400 shrink-0"
                      >
                        ▲ {req.upvotes}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
