import React, { useEffect } from 'react';
import { SiteSettings, SMMService } from '../../types';
import {
  BD_MAIN_SEO_KEYWORD,
  DEFAULT_BD_SEO_KEYWORDS_STRING
} from '../../data/seedServices';

interface SeoHeadManagerProps {
  currentTab: string;
  navParams?: any;
  siteSettings: SiteSettings;
  services: SMMService[];
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
  services
}) => {
  useEffect(() => {
    const brandName = siteSettings.siteName?.trim() || 'AmarTrend SMM';
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
      `${brandName} – #1 ${BD_MAIN_SEO_KEYWORD}`;

    const baseDescription =
      siteSettings.seoDescription?.trim() ||
      'বাংলাদেশের সেরা ও সবচেয়ে কম দামে অটোমেটিক SMM Panel। বিকাশ ও নগদে তাৎক্ষণিক ডিপোজিট করে Facebook Page Monetization, 60k Watchtime, Non-Drop Followers, YouTube 4000h Watchtime ও TikTok Views নিন।';

    const keywords = siteSettings.seoKeywords?.trim() || DEFAULT_BD_SEO_KEYWORDS_STRING;

    // Route-aware title, description, and canonical path
    let pageTitle = baseTitle;
    let pageDescription = baseDescription;
    let canonicalUrl = `${baseOrigin}/`;

    const activeCategory = navParams?.category ? String(navParams.category).trim() : '';

    if (currentTab === 'services') {
      if (activeCategory && activeCategory !== 'All') {
        pageTitle = `Buy ${activeCategory} Services in Bangladesh (bKash/Nagad) | ${brandName}`;
        pageDescription = `বাংলাদেশে সবচেয়ে কম দামে ${activeCategory} Followers, Views, Watchtime ও Monetization সার্ভিস নিন। বিকাশ ও নগদে অটোমেটিক পেমেন্ট ও ইনস্ট্যান্ট ডেলিভারি।`;
        canonicalUrl = `${baseOrigin}/?tab=services&category=${encodeURIComponent(activeCategory)}`;
      } else {
        pageTitle = `SMM Services & BDT Price List Bangladesh (bKash/Nagad) | ${brandName}`;
        pageDescription = `লাইভ SMM সার্ভিস ক্যাটালগ ও বাংলাদেশের সর্বনিম্ন রেট লিস্ট (BDT)। Facebook Monetization, YouTube 4000h Watchtime, TikTok Views ও Instagram Followers।`;
        canonicalUrl = `${baseOrigin}/?tab=services`;
      }
    } else if (currentTab === 'api' || currentTab === 'api-docs') {
      pageTitle = `Wholesale SMM Reseller API v2 Provider Bangladesh | ${brandName}`;
      pageDescription = `বাংলাদেশের রিসেলার ও এজেন্সিগুলোর জন্য হাই-স্পিড SMM REST API v2। অটোমেটিক অর্ডার ডিসপ্যাচ, রিফিল ও বিকাশ/নগদ ওয়ালেট গেটওয়ে।`;
      canonicalUrl = `${baseOrigin}/?tab=api`;
    } else if (currentTab === 'track') {
      pageTitle = `Live SMM Order Tracker Bangladesh | ${brandName}`;
      pageDescription = `আপনার অর্ডার আইডি দিয়ে রিয়েল-টাইম স্টার্ট কাউন্ট, ডেলিভারি প্রগ্রেস এবং রিমেইনস স্ট্যাটাস ট্র্যাক করুন।`;
      canonicalUrl = `${baseOrigin}/?tab=track`;
    } else if (currentTab === 'add-funds') {
      pageTitle = `Instant bKash & Nagad Auto Deposit Wallet | ${brandName}`;
      pageDescription = `ZiniPay অটোমেটিক পেমেন্ট গেটওয়ের মাধ্যমে বিকাশ, নগদ, রকেট ও উপায়ে ১ ক্লিকে তাৎক্ষণিক ওয়ালেট ডিপোজিট করুন।`;
      canonicalUrl = `${baseOrigin}/?tab=add-funds`;
    }

    document.title = pageTitle;

    // Update standard & social meta tags
    upsertMetaTag('name', 'description', pageDescription);
    upsertMetaTag('name', 'keywords', keywords);
    upsertMetaTag('property', 'og:title', pageTitle);
    upsertMetaTag('property', 'og:description', pageDescription);
    upsertMetaTag('property', 'og:url', canonicalUrl);
    upsertMetaTag('property', 'og:site_name', `${brandName} Bangladesh`);
    upsertMetaTag('name', 'twitter:title', pageTitle);
    upsertMetaTag('name', 'twitter:description', pageDescription);

    if (siteSettings.seoOgImage?.trim()) {
      upsertMetaTag('property', 'og:image', siteSettings.seoOgImage.trim());
      upsertMetaTag('name', 'twitter:image', siteSettings.seoOgImage.trim());
    }

    // Google Search Console verification tag
    if (siteSettings.googleSiteVerification?.trim()) {
      const cleanToken = siteSettings.googleSiteVerification
        .trim()
        .replace(/^.*content=["']([^"']+)["'].*$/i, '$1');
      upsertMetaTag('name', 'google-site-verification', cleanToken);
    }

    // Canonical & Hreflang links for Google Bangladesh
    upsertLinkTag('canonical', canonicalUrl);
    upsertLinkTag('alternate', canonicalUrl, 'bn-BD');
    upsertLinkTag('alternate', canonicalUrl, 'en');
    upsertLinkTag('alternate', canonicalUrl, 'x-default');

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

    const jsonLdGraph: Record<string, any> = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebApplication',
          '@id': `${baseOrigin}/#webapp`,
          name: `${brandName} Bangladesh`,
          alternateName: BD_MAIN_SEO_KEYWORD,
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
          name: `${brandName} Bangladesh`,
          url: `${baseOrigin}/`,
          areaServed: 'BD',
          knowsLanguage: ['bn-BD', 'en'],
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
          '@id': `${baseOrigin}/#faq`,
          mainEntity: [
            {
              '@type': 'Question',
              name: 'বাংলাদেশে সবচেয়ে কম দামে বিকাশ ও নগদে অটোমেটিক SMM Panel কোনটি?',
              acceptedAnswer: {
                '@type': 'Answer',
                text: `${brandName} হলো বাংলাদেশের সেরা ও সবচেয়ে কম দামের অটোমেটিক SMM Panel, যেখানে ZiniPay গেটওয়ের মাধ্যমে বিকাশ (bKash), নগদ (Nagad), রকেট (Rocket) এবং উপায় (Upay) দিয়ে তাৎক্ষণিক অটো ডিপোজিট করে ফেসবুক, ইউটিউব, টিকটক ও ইনস্টাগ্রাম সার্ভিস নেওয়া যায়।`
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
  }, [currentTab, navParams, siteSettings, services]);

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
