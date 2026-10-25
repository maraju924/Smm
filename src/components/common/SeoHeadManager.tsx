import React, { useEffect } from 'react';
import { SiteSettings, SMMService, SMMBlogPost } from '../../types';
import {
  BRAND_LOGO_URL,
  BD_MAIN_SEO_KEYWORD,
  DEFAULT_BD_SEO_KEYWORDS_STRING,
  INITIAL_SEO_BLOG_POSTS
} from '../../data/seedServices';
import { PROGRAMMATIC_SEO_LANDING_PAGES } from '../../services/blogSeoService';

interface SeoHeadManagerProps {
  currentTab: string;
  navParams?: any;
  siteSettings: SiteSettings;
  services: SMMService[];
  blogs?: SMMBlogPost[];
}

function upsertMetaTag(attrName: 'name' | 'property', attrValue: string, content: string) {
  if (!content) return;
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attrName, attrValue);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLinkTag(rel: string, href: string, hreflang?: string) {
  if (!href) return;
  const selector = hreflang
    ? `link[rel="${rel}"][hreflang="${hreflang}"]`
    : `link[rel="${rel}"]:not([hreflang])`;
  let el = document.head.querySelector(selector) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    if (hreflang) {
      el.setAttribute('hreflang', hreflang);
    }
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export const SeoHeadManager: React.FC<SeoHeadManagerProps> = ({
  currentTab,
  navParams,
  siteSettings,
  services,
  blogs = INITIAL_SEO_BLOG_POSTS
}) => {
  useEffect(() => {
    const brandName = siteSettings.siteName?.trim() || 'Boostlagbe.com';
    const rawDomain = (
      siteSettings.seoCanonicalDomain ||
      siteSettings.zinipayBrandDomain ||
      window.location.origin
    ).trim();

    const baseOrigin = rawDomain
      ? rawDomain.startsWith('http')
        ? rawDomain.replace(/\/+$/, '')
        : `https://${rawDomain.replace(/\/+$/, '')}`
      : window.location.origin;

    const baseTitle =
      siteSettings.seoTitle?.trim() ||
      `Boostlagbe.com – বুস্ট লাগবে | #1 Cheapest bKash Nagad SMM Panel Bangladesh (বুস্টলাগবে ডট কম)`;

    const baseDescription =
      siteSettings.seoDescription?.trim() ||
      'Boostlagbe.com (বুস্ট লাগবে / বুস্টলাগবে ডট কম) — বাংলাদেশের ১ নম্বর ও সবচেয়ে কম দামে অটোমেটিক SMM Panel। বিকাশ ও নগদে তাৎক্ষণিক ডিপোজিট করে Facebook Page Monetization, 60k Watchtime, Non-Drop Followers, YouTube 4000h Watchtime ও TikTok Views নিন। Boost Lagbe BD।';

    let keywords = siteSettings.seoKeywords?.trim() || DEFAULT_BD_SEO_KEYWORDS_STRING;

    // Route-aware title, description, breadcrumb name, robots policy, and canonical URL
    let pageTitle = baseTitle;
    let pageDescription = baseDescription;
    let canonicalUrl = `${baseOrigin}/`;
    let breadcrumbLabel = 'Home';
    let robotsDirective = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
    let pageSchemaType = 'WebPage';
    let ogType = 'website';
    let ogImg = siteSettings.seoOgImage?.trim() || BRAND_LOGO_URL;

    const activeCategory = navParams?.category ? String(navParams.category).trim() : '';
    const activeSlug = navParams?.slug ? String(navParams.slug).trim().toLowerCase() : '';
    const activePseo = navParams?.pseo ? String(navParams.pseo).trim().toLowerCase() : '';
    const activeDivision = navParams?.division ? String(navParams.division).trim().toLowerCase() : '';
    const activeBlogPost =
      currentTab === 'blog' && activeSlug
        ? blogs.find((b) => b.slug.toLowerCase() === activeSlug || b.id.toLowerCase() === activeSlug)
        : null;
    const activePseoPage =
      currentTab === 'blog' && activePseo
        ? PROGRAMMATIC_SEO_LANDING_PAGES.find((p) => p.slug.toLowerCase() === activePseo)
        : null;

    if (currentTab === 'blog') {
      if (activeBlogPost) {
        pageTitle = activeBlogPost.seoTitle?.trim() || `${activeBlogPost.title} | ${brandName}`;
        pageDescription = activeBlogPost.seoDescription?.trim() || activeBlogPost.excerpt;
        canonicalUrl =
          activeBlogPost.canonicalUrl?.trim() ||
          `${baseOrigin}/?tab=blog&slug=${encodeURIComponent(activeBlogPost.slug)}`;
        breadcrumbLabel = activeBlogPost.title;
        robotsDirective =
          activeBlogPost.metaRobots === 'noindex, follow'
            ? 'noindex, follow'
            : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
        pageSchemaType = activeBlogPost.schemaType || 'BlogPosting';
        ogType = 'article';
        if (activeBlogPost.coverImage) {
          ogImg = activeBlogPost.coverImage.startsWith('http')
            ? activeBlogPost.coverImage
            : `${baseOrigin}${activeBlogPost.coverImage}`;
        }
        const postKws = [
          activeBlogPost.focusKeyword,
          ...(activeBlogPost.secondaryKeywords || []),
          ...(activeBlogPost.tags || [])
        ]
          .filter(Boolean)
          .join(', ');
        if (postKws) {
          keywords = `${postKws}, ${keywords}`;
        }
      } else if (activePseoPage) {
        pageTitle = `${activePseoPage.title} | ${brandName}`;
        pageDescription = `${activePseoPage.summary} মাত্র ৳${activePseoPage.startingRateBdt} থেকে শুরু (${activePseoPage.deliverySpeed}, ${activePseoPage.refillGuarantee})।`;
        canonicalUrl = `${baseOrigin}/?tab=blog&pseo=${encodeURIComponent(activePseoPage.slug)}`;
        breadcrumbLabel = activePseoPage.title;
        pageSchemaType = 'WebPage';
        keywords = `${activePseoPage.targetKeyword}, ${activePseoPage.banglishQuery}, ${keywords}`;
      } else if (activeDivision) {
        const divCap = activeDivision.charAt(0).toUpperCase() + activeDivision.slice(1);
        pageTitle = `Best SMM Panel in ${divCap} Bangladesh (বিকাশ/নগদ সোশ্যাল মিডিয়া বুস্ট) | ${brandName}`;
        pageDescription = `${divCap} বিভাগের এফ-কমার্স উদ্যোক্তা, ইউটিউবার ও ক্রিয়েটরদের জন্য ১ নম্বর অটোমেটিক SMM Panel। বিকাশ ও নগদে সবচেয়ে কম দামে ফলোয়ার, ওয়াচটাইম ও মনিটাইজেশন প্যাক নিন।`;
        canonicalUrl = `${baseOrigin}/?tab=blog&division=${encodeURIComponent(activeDivision)}`;
        breadcrumbLabel = `${divCap} Division SMM Hub`;
        pageSchemaType = 'WebPage';
        keywords = `best smm panel ${activeDivision} bangladesh, facebook boost ${activeDivision} bkash, ${keywords}`;
      } else {
        pageTitle = `SMM Marketing & Growth Blog Bangladesh (বুস্ট লাগবে গাইড) | ${brandName}`;
        pageDescription = `ফেসবুক পেজ মনিটাইজেশন, টিকটক ভাইরাল ট্রিকস, ইউটিউব ৪০০০ ঘণ্টা ওয়াচটাইম এবং এসএমএম রিসেলার মার্কেটিং নিয়ে সম্পূর্ণ বাংলা গাইড পড়ুন ${brandName}-এ।`;
        canonicalUrl = `${baseOrigin}/?tab=blog`;
        breadcrumbLabel = 'SMM Blog & Guides';
        pageSchemaType = 'Blog';
      }
    } else if (currentTab === 'services') {
      if (activeCategory && activeCategory !== 'All') {
        pageTitle = `Buy ${activeCategory} Boost Services BD (বুস্ট লাগবে) | ${brandName}`;
        pageDescription = `Boostlagbe.com (বুস্ট লাগবে)-এ সবচেয়ে কম দামে ${activeCategory} Followers, Views, Watchtime ও Monetization সার্ভিস নিন। বিকাশ ও নগদে অটোমেটিক পেমেন্ট ও ইনস্ট্যান্ট ডেলিভারি।`;
        canonicalUrl = `${baseOrigin}/?tab=services&category=${encodeURIComponent(activeCategory)}`;
        breadcrumbLabel = `${activeCategory} SMM Services BD`;
      } else {
        pageTitle = `SMM Services & BDT Price List (বুস্ট লাগবে ডট কম) | ${brandName}`;
        pageDescription = `Boostlagbe.com (বুস্টলাগবে) লাইভ SMM সার্ভিস ক্যাটালগ ও বাংলাদেশের সর্বনিম্ন রেট লিস্ট (BDT)। Facebook Monetization, YouTube 4000h Watchtime, TikTok Views ও Instagram Followers।`;
        canonicalUrl = `${baseOrigin}/?tab=services`;
        breadcrumbLabel = 'Services & Price List';
      }
    } else if (currentTab === 'api' || currentTab === 'api-docs') {
      pageTitle = `Wholesale SMM Reseller API v2 Provider Bangladesh | ${brandName}`;
      pageDescription = `বাংলাদেশের রিসেলার ও এজেন্সিগুলোর জন্য হাই-স্পিড SMM REST API v2। অটোমেটিক অর্ডার ডিসপ্যাচ, রিফিল ও বিকাশ/নগদ ওয়ালেট গেটওয়ে।`;
      canonicalUrl = `${baseOrigin}/?tab=api`;
      breadcrumbLabel = 'Developer API v2';
    } else if (currentTab === 'track' || currentTab === 'track-order') {
      pageTitle = `Live SMM Order Tracker Bangladesh (বুস্ট লাগবে) | ${brandName}`;
      pageDescription = `আপনার অর্ডার আইডি দিয়ে রিয়েল-টাইম স্টার্ট কাউন্ট, ডেলিভারি প্রগ্রেস এবং রিমেইনস স্ট্যাটাস ট্র্যাক করুন।`;
      canonicalUrl = `${baseOrigin}/?tab=track`;
      breadcrumbLabel = 'Live Order Tracker';
    } else if (currentTab === 'add-funds') {
      pageTitle = `Instant bKash & Nagad Auto Deposit Wallet | ${brandName}`;
      pageDescription = `বিকাশ, নগদ, রকেট ও উপায়ে ১ ক্লিকে তাৎক্ষণিক ওয়ালেট ডিপোজিট করুন।`;
      canonicalUrl = `${baseOrigin}/?tab=add-funds`;
      breadcrumbLabel = 'bKash & Nagad Auto Deposit';
    } else if (currentTab === 'new-order') {
      pageTitle = `Place Instant SMM Order in Bangladesh (বুস্ট লাগবে) | ${brandName}`;
      pageDescription = `ফেসবুক মনিটাইজেশন, ইউটিউব ৪০০০ ঘণ্টা ওয়াচটাইম ও টিকটক ভিউ অর্ডার করুন তাৎক্ষণিক অটোমেটিক ডেলিভারিতে।`;
      canonicalUrl = `${baseOrigin}/?tab=new-order`;
      breadcrumbLabel = 'New Order';
    } else if (currentTab === 'affiliates') {
      pageTitle = `SMM Reseller Affiliate Program & Promo Vouchers BD | ${brandName}`;
      pageDescription = `বন্ধুদের রেফার করে আজীবন কমিশন আয় করুন এবং ফ্রি প্রোমো ভাউচার কোড রিডিম করে ওয়ালেট ব্যালেন্স নিন।`;
      canonicalUrl = `${baseOrigin}/?tab=affiliates`;
      breadcrumbLabel = 'Affiliates & Vouchers';
    } else if (currentTab === 'about') {
      pageTitle = `About ${brandName} (বুস্ট লাগবে) – #1 Automated bKash Nagad SMM Panel Bangladesh`;
      pageDescription = `${brandName} (বুস্ট লাগবে ডট কম) সম্পর্কে জানুন — বাংলাদেশের ১ নম্বর অটোমেটিক SMM ও মনিটাইজেশন ইনফ্রাস্ট্রাকচার।`;
      canonicalUrl = `${baseOrigin}/?tab=about`;
      breadcrumbLabel = 'About Us';
      pageSchemaType = 'AboutPage';
    } else if (currentTab === 'contact') {
      pageTitle = `Contact Us & 24/7 Bangladesh Help Center | ${brandName}`;
      pageDescription = `অর্ডার রিফিল, বিকাশ/নগদ পেমেন্ট অথবা রিসেলার API v2 সাপোর্টের জন্য আমাদের ২৪/৭ বাংলাদেশ কাস্টমার হেল্প সেন্টারে যোগাযোগ করুন।`;
      canonicalUrl = `${baseOrigin}/?tab=contact`;
      breadcrumbLabel = 'Contact & Help Center';
      pageSchemaType = 'ContactPage';
    } else if (currentTab === 'terms') {
      pageTitle = `Terms of Service & Usage Rules | ${brandName} Bangladesh`;
      pageDescription = `${brandName}-এ অর্ডার প্লেসমেন্ট, পাবলিক লিংক নিয়মাবলী, ওয়ালেট ডিপোজিট এবং REST API v2 ব্যবহারের অফিশিয়াল শর্তাবলী।`;
      canonicalUrl = `${baseOrigin}/?tab=terms`;
      breadcrumbLabel = 'Terms of Service';
    } else if (currentTab === 'privacy') {
      pageTitle = `Privacy Policy & Zero-Password Security | ${brandName} Bangladesh`;
      pageDescription = `আমাদের জিরো-পাসওয়ার্ড সিকিউরিটি পলিসি, এনক্রিপ্টেড বিকাশ/নগদ ট্রানজেকশন এবং ক্লায়েন্ট ডাটা গোপনীয়তা নীতিমালা।`;
      canonicalUrl = `${baseOrigin}/?tab=privacy`;
      breadcrumbLabel = 'Privacy Policy';
    } else if (currentTab === 'refund') {
      pageTitle = `100% Automated Refund, Cancel & Refill Policy | ${brandName} BD`;
      pageDescription = `অর্ডার ক্যানসেল হলে ১০০% সম্পূর্ণ রিফান্ড এবং পার্শিয়াল (Partial) অর্ডারে অবশিষ্ট ইউনিটের টাকা স্বয়ংক্রিয়ভাবে ওয়ালেটে ফেরত পাওয়ার গ্যারান্টি।`;
      canonicalUrl = `${baseOrigin}/?tab=refund`;
      breadcrumbLabel = 'Refund & Refill Policy';
    } else if (currentTab === '404') {
      pageTitle = `404 Page Not Found | ${brandName} Bangladesh`;
      pageDescription = `কাঙ্ক্ষিত পেজটি খুঁজে পাওয়া যায়নি। বাংলাদেশের সেরা অটোমেটিক SMM সার্ভিস ক্যাটালগ ও অর্ডার ট্র্যাকারে ফিরে যান।`;
      canonicalUrl = `${baseOrigin}/`;
      breadcrumbLabel = '404 Not Found';
      robotsDirective = 'noindex, follow';
    } else if (currentTab === 'maintenance') {
      pageTitle = `Scheduled System Maintenance | ${brandName} Bangladesh`;
      pageDescription = `আমাদের ক্লাউড API v2 এবং পেমেন্ট গেটওয়ে আপগ্রেডের কাজ চলছে। খুব শীঘ্রই সকল সার্ভিস পুনরায় সচল হবে।`;
      canonicalUrl = `${baseOrigin}/`;
      breadcrumbLabel = 'System Maintenance';
      robotsDirective = 'noindex, follow';
    }

    document.title = pageTitle;

    // Update standard & social meta tags
    upsertMetaTag('name', 'description', pageDescription);
    upsertMetaTag('name', 'keywords', keywords);
    upsertMetaTag('name', 'robots', robotsDirective);
    upsertMetaTag('name', 'googlebot', robotsDirective);
    upsertMetaTag('property', 'og:type', ogType);
    upsertMetaTag('property', 'og:title', pageTitle);
    upsertMetaTag('property', 'og:description', pageDescription);
    upsertMetaTag('property', 'og:url', canonicalUrl);
    upsertMetaTag('property', 'og:site_name', `${brandName} – বুস্ট লাগবে`);
    upsertMetaTag('name', 'twitter:title', pageTitle);
    upsertMetaTag('name', 'twitter:description', pageDescription);
    upsertMetaTag('property', 'og:image', ogImg);
    upsertMetaTag('name', 'twitter:image', ogImg);
    upsertLinkTag('icon', BRAND_LOGO_URL);

    if (activeBlogPost) {
      upsertMetaTag(
        'property',
        'article:published_time',
        new Date(activeBlogPost.publishedAt || activeBlogPost.createdAt).toISOString()
      );
      upsertMetaTag(
        'property',
        'article:modified_time',
        new Date(activeBlogPost.updatedAt || activeBlogPost.publishedAt).toISOString()
      );
      upsertMetaTag('property', 'article:section', activeBlogPost.category);
    }

    // Google Search Console verification tag (prepended to top of <head> & supports raw token, <meta> tag, or google*.html)
    if (siteSettings.googleSiteVerification?.trim()) {
      const rawVerif = siteSettings.googleSiteVerification.trim();
      const metaMatch = rawVerif.match(/content=["']([^"']+)["']/i);
      const prefixMatch = rawVerif.match(/^google-site-verification[=:\s]+([^\s"'>]+)/i);
      const cleanToken = metaMatch?.[1]
        ? metaMatch[1].trim()
        : prefixMatch?.[1]
        ? prefixMatch[1].trim()
        : rawVerif.replace(/^<meta[^>]*>|<\/meta>$/gi, '').replace(/\.html$/i, '').trim();

      let gscMeta = document.head.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement | null;
      if (!gscMeta) {
        gscMeta = document.createElement('meta');
        gscMeta.setAttribute('name', 'google-site-verification');
        document.head.prepend(gscMeta);
      }
      gscMeta.setAttribute('content', cleanToken);
    }

    // Google Analytics 4 (gtag.js) injection (Also enables Google Search Console verification via GA4)
    if (siteSettings.googleAnalyticsId?.trim()) {
      const gaId = siteSettings.googleAnalyticsId.trim();
      if (/^G-[A-Z0-9]+$/i.test(gaId) && !document.getElementById('ga4-gtag-script')) {
        const scriptAsync = document.createElement('script');
        scriptAsync.id = 'ga4-gtag-script';
        scriptAsync.async = true;
        scriptAsync.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
        document.head.prepend(scriptAsync);

        const scriptInit = document.createElement('script');
        scriptInit.id = 'ga4-gtag-init';
        scriptInit.text = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`;
        document.head.prepend(scriptInit);
      }
    }

    // Canonical & Hreflang links for Google Bangladesh + RSS 2.0 Syndication Link
    upsertLinkTag('canonical', canonicalUrl);
    upsertLinkTag('alternate', canonicalUrl, 'bn-BD');
    upsertLinkTag('alternate', canonicalUrl, 'en');
    upsertLinkTag('alternate', canonicalUrl, 'x-default');

    let rssLink = document.head.querySelector(
      'link[rel="alternate"][type="application/rss+xml"]'
    ) as HTMLLinkElement | null;
    if (!rssLink) {
      rssLink = document.createElement('link');
      rssLink.rel = 'alternate';
      rssLink.type = 'application/rss+xml';
      rssLink.title = `${brandName} Official SMM Blog & Creator Guides RSS Feed`;
      document.head.appendChild(rssLink);
    }
    rssLink.href = `${baseOrigin}/rss.xml`;

    // Dynamic Multi-Entity Schema.org JSON-LD (@graph)
    const activeServices = services.filter((s) => s.status !== 'disabled');
    const sortedRates = [...activeServices].sort((a, b) => a.rate - b.rate);
    const lowPrice = sortedRates.length > 0 ? Math.max(1, sortedRates[0].rate) : 5;
    const highPrice =
      sortedRates.length > 0 ? Math.max(100, sortedRates[sortedRates.length - 1].rate) : 25000;

    const topCatalogOffers = sortedRates.slice(0, 10).map((srv, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Service',
        name: srv.name,
        category: srv.category,
        provider: {
          '@type': 'Organization',
          name: brandName
        },
        areaServed: {
          '@type': 'Country',
          name: 'Bangladesh'
        },
        offers: {
          '@type': 'Offer',
          price: String(srv.rate),
          priceCurrency: 'BDT',
          availability: 'https://schema.org/InStock'
        }
      }
    }));

    const breadcrumbItems: any[] = [
      {
        '@type': 'ListItem',
        position: 1,
        name: `${brandName} Bangladesh`,
        item: `${baseOrigin}/`
      }
    ];

    if (currentTab === 'blog' && activeBlogPost) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: 'SMM Blog & Guides',
        item: `${baseOrigin}/?tab=blog`
      });
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: activeBlogPost.title,
        item: canonicalUrl
      });
    } else if (currentTab !== 'landing' && currentTab !== 'home') {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 2,
        name: breadcrumbLabel,
        item: canonicalUrl
      });
    }

    const blogPostingSchema = activeBlogPost
      ? [
          {
            '@type': activeBlogPost.schemaType || 'BlogPosting',
            '@id': `${canonicalUrl}#article`,
            mainEntityOfPage: {
              '@type': 'WebPage',
              '@id': canonicalUrl
            },
            headline: activeBlogPost.title,
            description: activeBlogPost.seoDescription || activeBlogPost.excerpt,
            abstract:
              activeBlogPost.sgeDirectAnswer ||
              activeBlogPost.seoDescription ||
              activeBlogPost.excerpt,
            image: [ogImg],
            datePublished: new Date(
              activeBlogPost.publishedAt || activeBlogPost.createdAt
            ).toISOString(),
            dateModified: new Date(
              activeBlogPost.updatedAt || activeBlogPost.publishedAt
            ).toISOString(),
            author: {
              '@type': 'Person',
              name: activeBlogPost.authorName || 'তানভীর আহমেদ (Tanvir Ahmed)',
              jobTitle:
                activeBlogPost.authorRole ||
                'Senior Social Media Growth Strategist, Boostlagbe.com',
              description:
                activeBlogPost.authorBio ||
                'বাংলাদেশের সোশ্যাল মিডিয়া গ্রোথ, মনিটাইজেশন ও এসইও স্ট্র্যাটেজি বিশেষজ্ঞ।',
              url: `${baseOrigin}/?tab=about`
            },
            reviewedBy: {
              '@type': 'Organization',
              name: activeBlogPost.reviewedBy || `${brandName} Editorial & SEO Review Board`
            },
            publisher: {
              '@type': 'Organization',
              name: brandName,
              logo: {
                '@type': 'ImageObject',
                url: `${baseOrigin}${BRAND_LOGO_URL}`
              }
            },
            about: [
              {
                '@type': 'Thing',
                name: 'Social Media Marketing',
                sameAs: 'https://en.wikipedia.org/wiki/Social_media_marketing'
              },
              {
                '@type': 'Thing',
                name: activeBlogPost.category || 'Facebook',
                sameAs: `https://en.wikipedia.org/wiki/${encodeURIComponent(
                  (activeBlogPost.category || 'Facebook').replace(/\s+/g, '_')
                )}`
              }
            ],
            mentions: [
              {
                '@type': 'Country',
                name: 'Bangladesh',
                sameAs: 'https://en.wikipedia.org/wiki/Bangladesh'
              },
              {
                '@type': 'Thing',
                name: 'bKash',
                sameAs: 'https://en.wikipedia.org/wiki/BKash'
              },
              {
                '@type': 'Thing',
                name: 'Nagad',
                sameAs: 'https://en.wikipedia.org/wiki/Nagad'
              }
            ],
            keywords: [
              activeBlogPost.focusKeyword,
              ...(activeBlogPost.secondaryKeywords || []),
              ...(activeBlogPost.banglishKeywords || []),
              ...(activeBlogPost.tags || [])
            ]
              .filter(Boolean)
              .join(', '),
            wordCount: activeBlogPost.wordCount || 650,
            articleSection: activeBlogPost.category,
            inLanguage: 'bn-BD',
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: ['h1', '[itemprop="abstract"]', '[itemprop="description"]']
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: String(activeBlogPost.ratingValue || 4.9),
              bestRating: '5',
              worstRating: '1',
              ratingCount: String(activeBlogPost.ratingCount || 68)
            }
          },
          ...(activeBlogPost.howToSteps && activeBlogPost.howToSteps.length > 0
            ? [
                {
                  '@type': 'HowTo',
                  '@id': `${canonicalUrl}#howto`,
                  name: activeBlogPost.title,
                  description: activeBlogPost.seoDescription || activeBlogPost.excerpt,
                  totalTime: `PT${activeBlogPost.readingTimeMinutes || 5}M`,
                  estimatedCost: {
                    '@type': 'MonetaryAmount',
                    currency: 'BDT',
                    value: '20'
                  },
                  step: activeBlogPost.howToSteps.map((st, idx) => ({
                    '@type': 'HowToStep',
                    position: idx + 1,
                    name: st.name || st.title || `ধাপ ${idx + 1}`,
                    text: st.text || st.description || '',
                    url: `${canonicalUrl}#howto-step-${idx + 1}`
                  }))
                }
              ]
            : []),
          {
            '@type': 'VideoObject',
            '@id': `${canonicalUrl}#video`,
            name: `${activeBlogPost.title} — প্র্যাকটিক্যাল টিউটোরিয়াল`,
            description: activeBlogPost.seoDescription || activeBlogPost.excerpt,
            thumbnailUrl: [ogImg],
            uploadDate: new Date(
              activeBlogPost.publishedAt || activeBlogPost.createdAt
            ).toISOString(),
            duration: `PT${Math.floor((activeBlogPost.videoDurationSeconds || 195) / 60)}M${
              (activeBlogPost.videoDurationSeconds || 195) % 60
            }S`,
            contentUrl: activeBlogPost.videoTutorialUrl || canonicalUrl,
            embedUrl: activeBlogPost.videoTutorialUrl || canonicalUrl
          }
        ]
      : [];

    const jsonLdGraph: Record<string, any> = {
      '@context': 'https://schema.org',
      '@graph': [
        ...blogPostingSchema,
        {
          '@type': activeBlogPost ? 'WebPage' : pageSchemaType,
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: pageTitle,
          description: pageDescription,
          inLanguage: ['bn-BD', 'en'],
          isPartOf: {
            '@id': `${baseOrigin}/#webapp`
          }
        },
        {
          '@type': 'BreadcrumbList',
          '@id': `${canonicalUrl}#breadcrumb`,
          itemListElement: breadcrumbItems
        },
        {
          '@type': 'WebApplication',
          '@id': `${baseOrigin}/#webapp`,
          name: `${brandName} – বুস্ট লাগবে`,
          alternateName: [
            'বুস্টলাগবে',
            'বুস্ট লাগবে',
            'বুস্ট লাগবে ডট কম',
            'বুস্টলাগবে ডট কম',
            'boostlagbe.com',
            'boost lagbe',
            'boost lagobe',
            'boost lagbe.com',
            'boostlagobe.com',
            BD_MAIN_SEO_KEYWORD
          ],
          url: `${baseOrigin}/`,
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'All',
          inLanguage: ['bn-BD', 'en'],
          description: baseDescription,
          areaServed: {
            '@type': 'Country',
            name: 'Bangladesh'
          },
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'BDT',
            lowPrice: String(lowPrice),
            highPrice: String(highPrice),
            offerCount: String(Math.max(activeServices.length, 50))
          },
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: '4.9',
            bestRating: '5',
            ratingCount: '1480'
          }
        },
        {
          '@type': 'Organization',
          '@id': `${baseOrigin}/#organization`,
          name: `${brandName} (বুস্ট লাগবে)`,
          alternateName: [
            'বুস্টলাগবে',
            'বুস্ট লাগবে',
            'বুস্ট লাগবে ডট কম',
            'boostlagbe.com',
            'boost lagbe',
            'boost lagobe'
          ],
          logo: `${baseOrigin}${BRAND_LOGO_URL}`,
          url: `${baseOrigin}/`,
          areaServed: 'BD',
          knowsLanguage: ['bn-BD', 'en'],
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'customer support',
              areaServed: 'BD',
              availableLanguage: ['Bengali', 'English'],
              url: `${baseOrigin}/?tab=contact`
            }
          ],
          ...(siteSettings.whatsappUrl || siteSettings.telegramUrl
            ? {
                sameAs: [siteSettings.whatsappUrl, siteSettings.telegramUrl].filter(Boolean)
              }
            : {})
        },
        ...(topCatalogOffers.length > 0
          ? [
              {
                '@type': 'ItemList',
                '@id': `${baseOrigin}/#catalog`,
                name: 'Bangladesh SMM Services & BDT Rate List',
                itemListElement: topCatalogOffers
              }
            ]
          : []),
        {
          '@type': 'FAQPage',
          '@id': `${canonicalUrl}#faq`,
          mainEntity:
            activeBlogPost && activeBlogPost.faqItems && activeBlogPost.faqItems.length > 0
              ? activeBlogPost.faqItems.map((f) => ({
                  '@type': 'Question',
                  name: f.question,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: f.answer
                  }
                }))
              : [
                  {
                    '@type': 'Question',
                    name: 'বাংলাদেশে সবচেয়ে কম দামে বিকাশ ও নগদে অটোমেটিক SMM Panel কোনটি?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: `${brandName} হলো বাংলাদেশের সেরা ও সবচেয়ে কম দামের অটোমেটিক SMM Panel, যেখানে বিকাশ (bKash), নগদ (Nagad), রকেট (Rocket) এবং উপায় (Upay) দিয়ে তাৎক্ষণিক অটো ডিপোজিট করে ফেসবুক, ইউটিউব, টিকটক ও ইনস্টাগ্রাম সার্ভিস নেওয়া যায়।`
                    }
                  },
                  {
                    '@type': 'Question',
                    name: 'ফেসবুক পেজ মনিটাইজেশন (60k Watchtime ও Non-Drop Followers) করতে কত সময় লাগে?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'আমাদের Facebook Page Monetization Package, 60,000 Minutes Watchtime এবং Non-Drop Profile/Page Followers সার্ভিস অর্ডার করার কয়েক মিনিটের মধ্যেই অটোমেটিক শুরু হয় এবং ২৪–৭২ ঘণ্টার মধ্যে সম্পন্ন হয়।'
                    }
                  },
                  {
                    '@type': 'Question',
                    name: 'ইউটিউব ৪০০০ ঘণ্টা ওয়াচটাইম ও ১০০০ সাবস্ক্রাইবার এবং টিকটক ভিউ কি নিরাপদ?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'হ্যাঁ, আমাদের সকল YouTube 4000 Hours Watchtime, Monetization Subscribers এবং TikTok Viral Views সার্ভিস ১০০% অর্গানিক-প্যাটার্ন ও নন-ড্রপ রিফিল গ্যারান্টিযুক্ত।'
                    }
                  },
                  {
                    '@type': 'Question',
                    name: 'অর্ডার ক্যানসেল বা পার্শিয়াল (Partial) হলে কি ওয়ালেটে টাকা রিফান্ড পাওয়া যায়?',
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: 'হ্যাঁ, ১০০% অটোমেটিক। কোনো অর্ডার ক্যানসেল হলে সম্পূর্ণ টাকা এবং পার্শিয়াল হলে বাকি থাকা ইউনিটের টাকা স্বয়ংক্রিয়ভাবে আপনার ওয়ালেট ব্যালেন্সে রিফান্ড হয়ে যায়।'
                    }
                  }
                ]
        }
      ]
    };

    let scriptEl = document.getElementById('dynamic-json-ld') as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = 'dynamic-json-ld';
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    scriptEl.textContent = JSON.stringify(jsonLdGraph);
  }, [currentTab, navParams, siteSettings, services, blogs]);

  // Optional Google Analytics 4 (gtag.js) injection
  useEffect(() => {
    const gaId = siteSettings.googleAnalyticsId?.trim();
    if (!gaId || !gaId.startsWith('G-')) return;
    if (document.getElementById('ga-gtag-script')) return;

    const s1 = document.createElement('script');
    s1.id = 'ga-gtag-script';
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(s1);

    const s2 = document.createElement('script');
    s2.id = 'ga-gtag-init';
    s2.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(s2);
  }, [siteSettings.googleAnalyticsId]);

  return null;
};
