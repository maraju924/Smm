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
  List
} from 'lucide-react';
import { SMMBlogPost, SMMService, SiteSettings } from '../../types';
import { incrementBlogViews } from '../../services/blogSeoService';

interface BlogViewProps {
  blogs: SMMBlogPost[];
  services: SMMService[];
  siteSettings?: SiteSettings;
  selectedSlug?: string | null;
  onSelectSlug: (slug: string | null) => void;
  onNavigate: (tab: string) => void;
  onSelectService?: (service: SMMService) => void;
  isPublicStandalone?: boolean;
  onOpenAuth?: () => void;
}

export const BlogView: React.FC<BlogViewProps> = ({
  blogs,
  services,
  siteSettings,
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
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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

  useEffect(() => {
    if (activePost) {
      incrementBlogViews(activePost.id, activePost.views || 0);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activePost?.id]);

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    publishedBlogs.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [publishedBlogs]);

  const filteredBlogs = useMemo(() => {
    return publishedBlogs.filter((post) => {
      const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
      if (!matchesCategory) return false;
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
  }, [publishedBlogs, selectedCategory, searchQuery]);

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
    if (!activePost) return services.slice(0, 4);
    const cat = activePost.category.toLowerCase();
    const matched = services.filter(
      (s) =>
        s.category.toLowerCase().includes(cat) ||
        cat.includes(s.category.toLowerCase()) ||
        activePost.focusKeyword.toLowerCase().includes(s.category.toLowerCase())
    );
    return (matched.length > 0 ? matched : services).slice(0, 4);
  }, [activePost, services]);

  const relatedPosts = useMemo(() => {
    if (!activePost) return [];
    return publishedBlogs.filter((b) => b.id !== activePost.id).slice(0, 3);
  }, [publishedBlogs, activePost]);

  const handleCopyCanonicalLink = (post: SMMBlogPost) => {
    const url = `${window.location.origin}/?tab=blog&slug=${encodeURIComponent(post.slug)}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
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

  return (
    <div className={isPublicStandalone ? 'min-h-screen bg-slate-50 dark:bg-slate-950 pb-20' : 'space-y-6 pb-10'}>
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
              <button
                onClick={() => onNavigate('landing')}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                হোমপেজ
              </button>
              <button
                onClick={() => (onOpenAuth ? onOpenAuth() : onNavigate('new_order'))}
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
             SINGLE SEO ARTICLE READER VIEW (100% SCHEMA MICRODATA)
             ========================================== */
          <article
            itemScope
            itemType={`https://schema.org/${activePost.schemaType || 'BlogPosting'}`}
            className="space-y-6"
          >
            {/* Breadcrumb Navigation */}
            <nav
              aria-label="Breadcrumb"
              className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs"
            >
              <button
                onClick={() => onSelectSlug(null)}
                className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 hover:underline font-bold mr-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> সব ব্লগ আর্টিকেল
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button onClick={() => onNavigate('home')} className="hover:text-indigo-600 transition-colors">
                হোম
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button onClick={() => onSelectSlug(null)} className="hover:text-indigo-600 transition-colors">
                ব্লগ ও গাইড
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-indigo-600 dark:text-indigo-400">{activePost.category}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-700 dark:text-slate-300 line-clamp-1 max-w-xs">
                {activePost.title}
              </span>
            </nav>

            {/* Article Hero Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
              {activePost.coverImage && (
                <div className="relative h-56 sm:h-80 w-full bg-slate-900 overflow-hidden">
                  <img
                    itemProp="image"
                    src={activePost.coverImage}
                    alt={activePost.coverImageAlt || activePost.title}
                    className="w-full h-full object-cover opacity-90"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 flex flex-wrap items-center justify-between gap-2">
                    <span className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-bold tracking-wide shadow-sm">
                      {activePost.category}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-bold backdrop-blur-md flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> ভেরিফাইড গাইড • Boostlagbe.com
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

                {/* Author & Publication Metadata Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-4">
                    <div
                      itemProp="author"
                      itemScope
                      itemType="https://schema.org/Organization"
                      className="flex items-center gap-2"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                        BL
                      </div>
                      <div>
                        <span itemProp="name" className="font-bold text-slate-800 dark:text-slate-200 block">
                          {activePost.authorName || 'Boostlagbe Editorial Team'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {activePost.authorRole || 'SMM Growth Specialist'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <time
                        itemProp="datePublished"
                        dateTime={new Date(activePost.publishedAt || activePost.createdAt).toISOString()}
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
              {/* Left 8 Cols: TOC + Rich Content + FAQ Schema + Tags */}
              <div className="lg:col-span-8 space-y-6">
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
                          className={item.level === 3 ? 'pl-4 text-slate-600 dark:text-slate-400' : 'font-semibold text-slate-800 dark:text-slate-200'}
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

                {/* Semantic Article Body */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-8 shadow-xs">
                  <div
                    itemProp="articleBody"
                    className="prose prose-slate dark:prose-invert max-w-none
                      prose-headings:font-extrabold prose-headings:text-slate-900 dark:prose-headings:text-white
                      prose-h2:text-xl sm:prose-h2:text-2xl prose-h2:mt-7 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-100 dark:prose-h2:border-slate-800
                      prose-h3:text-lg sm:prose-h3:text-xl prose-h3:mt-5 prose-h3:mb-2
                      prose-p:text-slate-700 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-4
                      prose-li:text-slate-700 dark:prose-li:text-slate-300 prose-li:my-1.5
                      prose-a:text-indigo-600 dark:prose-a:text-indigo-400 prose-a:font-bold hover:prose-a:underline
                      prose-strong:text-slate-900 dark:prose-strong:text-white"
                    dangerouslySetInnerHTML={{ __html: processedArticle.html }}
                  />

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
                      onClick={() => (isPublicStandalone && onOpenAuth ? onOpenAuth() : onNavigate('new_order'))}
                      className="px-5 py-3 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-extrabold text-xs shrink-0 shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Zap className="w-4 h-4" /> এখনই অর্ডার করুন
                    </button>
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

              {/* Right 4 Cols: Related Services + Popular Posts */}
              <aside className="lg:col-span-4 space-y-6">
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
                    {relatedServices.map((srv) => (
                      <div
                        key={srv.id}
                        className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/40 bg-slate-50/50 dark:bg-slate-800/30 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            {srv.category}
                          </span>
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            ৳{srv.ratePer1000} / ১,০০০
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
                              onNavigate('new_order');
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

                {/* Other Pillar Articles */}
                {relatedPosts.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs space-y-4">
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-indigo-500" /> আরও পড়ুন
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
          </article>
        ) : (
          /* ==========================================
             BLOG HUB LISTING VIEW (ALL SEO ARTICLES)
             ========================================== */
          <div className="space-y-6">
            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 border border-indigo-500/20 shadow-lg">
              <div className="relative z-10 max-w-2xl space-y-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
                  <BookOpen className="w-3.5 h-3.5" /> সোশ্যাল মিডিয়া মার্কেটিং ও গ্রোথ একাডেমি
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  Boostlagbe.com অফিসিয়াল ব্লগ ও গাইডলাইন
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  ফেসবুক পেজ মনিটাইজেশন, টিকটক ভাইরাল ট্রিকস, ইউটিউব ৪০০০ ঘণ্টা ওয়াচটাইম এবং রিসেলার মার্কেটিং নিয়ে বিস্তারিত গাইড পড়ুন।
                </p>
              </div>
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
                    {cat === 'All' ? 'সব ক্যাটাগরি' : cat}
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
                {filteredBlogs.map((post) => (
                  <article
                    key={post.id}
                    onClick={() => onSelectSlug(post.slug)}
                    className="group cursor-pointer bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs hover:shadow-xl hover:border-indigo-500/40 transition-all flex flex-col"
                  >
                    <div className="relative h-48 bg-slate-900 overflow-hidden">
                      <img
                        src={
                          post.coverImage ||
                          '/assets/aistudio/file_00000000117c8208a1cede2cdfee706a_42e73997.png'
                        }
                        alt={post.coverImageAlt || post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                      <div className="absolute top-3 left-3 flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-600/95 text-white text-[11px] font-bold shadow-xs">
                          {post.category}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] text-slate-200 font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" /> {post.readingTimeMinutes || 4} মিনিট পড়ুন
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3 text-emerald-400" /> {(post.views || 120).toLocaleString()} ভিউ
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
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
