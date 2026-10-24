# Resilient Vercel API Routing & Instant Order Validation Engine

This plan resolves the **`Unexpected token 'A', "A server e"... is not valid JSON`** error during link verification and order placement on Vercel by isolating the serverless API runtime from development build tools, hardening all API response parsers against non-JSON error pages, and adding instant client-side social link validation and automatic order queue fallbacks.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Your confirmed preferences from Phase 1 govern the error-handling and serverless execution architecture below:

- **Confirmed Decision 1 (Social Media Link Verification)**: **Auto-fallback to instant client validation if the server fails.** When verifying a target URL or submitting a new order, the app will attempt server-side link inspection first, and if the serverless endpoint is unreachable or returns a non-JSON response, it will seamlessly fall back to an instant client-side URL normalizer and platform detector (`Facebook`, `Instagram`, `YouTube`, `TikTok`, `Telegram`, `Twitter/X`) so valid orders are never blocked.
- **Confirmed Decision 2 (Vercel Serverless API & Upstream Order Routing)**: **Standalone Vercel API bundle with automatic queue fallback.** The Vercel serverless entry point will run as a pure, self-contained Express API without importing Vite or local development dependencies, and upstream provider order dispatching will resolve provider credentials server-side with automatic fallback to the cloud order queue if an upstream provider times out.

---

## 1. Overview & Core Concept

- **What It Does**: Eliminates the `SyntaxError: Unexpected token 'A', "A server e"... is not valid JSON` failure on Vercel when users click **"লিংক যাচাই করুন" (Verify Link)**, submit orders in the **New Order** or **Mass Order** terminals, sync providers, or initiate ZiniPay wallet deposits.
- **Why the Error Happened**:
  1. On Vercel, serverless functions execute inside a stripped Node ESM runtime. Because the backend module contained a dynamic `import('vite')` reference and development server bootstrap logic, Vercel's serverless invocation returned a plain-text `500: A server error has occurred` response.
  2. The frontend called `res.json()` directly on that plain-text response without checking `res.ok` or `Content-Type: application/json`, causing `Unexpected token 'A', "A server e"... is not valid JSON` to display inside the order form and block order submission.
- **Target Audience / Persona**: Bangladeshi SMM panel customers and resellers placing orders on mobile (`375px–430px`) and desktop (`1440px`) viewports, as well as administrators managing upstream SMM providers.
- **Key Value**: 100% uninterrupted order placement, instant social URL verification with platform detection (`Facebook`, `Instagram`, `YouTube`, `TikTok`, `Telegram`, `X`), and rock-solid Vercel serverless API responses.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Target Link Verification ("লিংক যাচাই করুন")**:
     - User pastes a social link (e.g., `https://www.facebook.com/share/p/19uA44tyxQ/` or `fb.watch/...` or `tiktok.com/...`).
     - If the backend API responds with JSON, the normalized URL and detected platform badge are displayed immediately.
     - If the serverless function is cold or unreachable, the instant client-side URL analyzer validates the protocol/hostname, normalizes missing `https://` prefixes, detects the social network, and displays a green verified state in `<50ms` with zero JSON syntax errors.
  2. **Order Placement & Confirmation Sheet ("অর্ডার প্লেস করুন")**:
     - Clicking **Place Order** validates service selection, link format, min/max quantity, and wallet balance, then opens the confirmation sheet.
     - Confirming the order executes link normalization, dispatches the order to the linked upstream provider (resolving provider credentials securely on the server or fallback), and commits the atomic Firestore wallet deduction + order creation transaction.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-craft dark SaaS & mobile-first touch terminal (`#080B14` primary canvas, `#0E1320` structural cards, `#6D28D9` / `#8B5CF6` violet primary actions, `#22D3EE` cyan telemetry accents).
  - *Color Palette & Contrast*: WCAG AA compliant `#F8FAFC` headings, `#CBD5E1` body copy, `#4ADE80` verified link states, and `#F87171` semantic error banners with human-readable Bengali/English messages (never raw JavaScript `SyntaxError` stack traces).
  - *Touch & Viewport Ergonomics*: Minimum `44px × 44px` touch targets on all mobile controls, `tabular-nums` on all BDT/USD rates and quantities, and full multi-column desktop expansion.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Safe JSON Response Parser (`safeFetchJson`) Across All API Calls**
  - *Chosen Approach*: Wrap every `/api/*` request in a unified `safeFetchJson` helper that inspects `res.headers.get('content-type')` and `res.text()` before parsing JSON, translating any HTML/plain-text 500/502/504 gateway response into a structured `{ ok: false, error }` object.
  - *Why*: Guarantees that `Unexpected token 'A', "A server e"... is not valid JSON` can never appear anywhere in the application—even if a third-party provider or CDN returns an HTML/text error page.
  - *Alternatives Considered*: Only fixing `analyzeSocialLinkOnServer` was rejected because provider sync, ZiniPay payment verification, and order status checks also call `/api/*` endpoints.
- **Decision 2: Decoupling the Express API Application from the Dev Server Runner**
  - *Chosen Approach*: Keep the Express API application completely free of `vite` imports so Vercel's `@vercel/node` bundler packages only lightweight API dependencies (`express` and `firebase`), while local development loads Vite middleware separately.
  - *Why*: Eliminates `FUNCTION_INVOCATION_FAILED` (`A server error has occurred`) on Vercel serverless cold starts.
- **Decision 3: Server-Side Provider Credential Lookup by `providerId` + Automatic Queue Fallback**
  - *Chosen Approach*: Allow the `/api/provider/order` endpoint to accept `providerId` and look up the provider's `apiUrl` and `apiKey` directly from Firestore on the server when not passed by the client, and if the upstream dispatch fails, still save the order in Firestore with `status: 'pending'` so no customer order or wallet transaction fails.
  - *Why*: Standard non-admin users cannot read the protected `providers` collection directly from the browser due to security rules; resolving `providerId` on the server enables seamless automatic upstream order forwarding for all customers.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   NewOrderView / MassOrderView / AddFundsView               │
└───────────────────┬─────────────────────────────────────────┬───────────────┘
                    │ 1. Verify Link / Place Order            │
                    ▼                                         ▼
┌───────────────────────────────────────────┐ ┌───────────────────────────────┐
│     Resilient API Client (safeFetchJson)  │ │ Instant Client Link Validator │
│  • Reads res.text() & checks JSON safely  │ │  • Protocol & Host Normalizer │
│  • Never throws SyntaxError on text/html  │ │  • Platform Auto-Detection    │
└───────────────────┬───────────────────────┘ └───────────────▲───────────────┘
                    │ 2. POST /api/*                          │ Fallback (<10ms)
                    ▼                                         │ if API offline
┌─────────────────────────────────────────────────────────────┴───────────────┐
│                Standalone Vercel Serverless Express API                     │
│  • Zero Vite / Dev-Bundler Imports in Production Serverless Entry           │
│  • /api/analyze-link    -> URL normalization & platform detection           │
│  • /api/provider/order  -> Resolves providerId on server + dispatches order │
│  • /api/zinipay/*       -> Automated bKash / Nagad payment gateway          │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ 3. Atomic Transaction
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Cloud Firestore (Orders & User Wallet)                   │
│  • Atomic balance deduction + order record creation (status: pending)       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping

- **Link Verification Handler**:
  - Invokes `/api/analyze-link` via `safeFetchJson`.
  - If the server responds with `{ valid: true }`, updates `linkAnalysis` and normalizes the input URL.
  - If the server is unreachable or returns a non-JSON error, executes the deterministic client-side URL analyzer (`analyzeSocialLinkLocally`) so valid Facebook, Instagram, YouTube, TikTok, Telegram, X, and web URLs pass immediately with zero false errors.
- **Order Execution Handler**:
  - Validates link via the hybrid server + client validator.
  - Dispatches upstream provider order via `/api/provider/order` (passing `providerId` so the server can read provider credentials even for non-admin users, plus client fallback).
  - Runs the atomic Firestore transaction to deduct `totalCharge` from `users/{uid}` and write `orders/{orderId}`.
