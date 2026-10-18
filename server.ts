import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc
} from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase config for server-side Firestore reads
const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));

const firebaseApp = initializeApp(firebaseConfig, 'server-instance');
const serverDb = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const SERVER_START_TIME = Date.now();

export interface ServerApiTrafficLog {
  id: string;
  timestamp: number;
  direction: 'upstream' | 'inbound_v2';
  action: string;
  endpoint: string;
  status: 'success' | 'error';
  httpCode: number;
  latencyMs: number;
  summary: string;
}

const apiTrafficLogs: ServerApiTrafficLog[] = [];
let totalApiCallsCounter = 0;

function recordApiLog(entry: Omit<ServerApiTrafficLog, 'id' | 'timestamp'>) {
  totalApiCallsCounter++;
  const newLog: ServerApiTrafficLog = {
    id: 'log-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
    timestamp: Date.now(),
    ...entry
  };
  apiTrafficLogs.unshift(newLog);
  if (apiTrafficLogs.length > 100) {
    apiTrafficLogs.pop();
  }
}

function calculateMarkedUpBdtRate(
  rawRate: number,
  currency: string = 'USD',
  usdToBdtRate: number = 122,
  profitMarginPercent: number = 20,
  fixedMarkupBdt: number = 0,
  priceRounding: 'none' | 'nearest_int' | 'ceil' = 'none'
): number {
  const exchangeMultiplier = currency.toUpperCase() === 'USD' ? Number(usdToBdtRate || 122) : 1;
  const marginMultiplier = 1 + Number(profitMarginPercent || 0) / 100;
  let bdtRate = rawRate * exchangeMultiplier * marginMultiplier + Number(fixedMarkupBdt || 0);
  bdtRate = Math.max(0.5, bdtRate);

  if (priceRounding === 'nearest_int') {
    return Math.max(1, Math.round(bdtRate));
  }
  if (priceRounding === 'ceil') {
    return Math.max(1, Math.ceil(bdtRate));
  }
  return Number(bdtRate.toFixed(2));
}

function mapRawStatusToEnum(rawStatusInput: any): string {
  const rawStatus = String(rawStatusInput || '').toLowerCase();
  if (rawStatus.includes('pending')) return 'pending';
  if (rawStatus.includes('processing')) return 'processing';
  if (rawStatus.includes('progress')) return 'in_progress';
  if (rawStatus.includes('completed')) return 'completed';
  if (rawStatus.includes('partial')) return 'partial';
  if (rawStatus.includes('cancel') || rawStatus.includes('refund')) return 'canceled';
  return 'in_progress';
}

async function resolveUserByApiKey(apiKey: string, fallbackUid?: string): Promise<{ uid: string; user: any } | null> {
  if (!apiKey) return null;

  // 1. Try direct lookup via api_keys/{apiKey} index
  try {
    const keySnap = await getDoc(doc(serverDb, 'api_keys', apiKey));
    if (keySnap.exists()) {
      const uid = keySnap.data()?.uid;
      if (uid) {
        const userSnap = await getDoc(doc(serverDb, 'users', String(uid)));
        if (userSnap.exists()) {
          const u = userSnap.data() as any;
          if (u.apiKey === apiKey) {
            return { uid: String(uid), user: u };
          }
        }
      }
    }
  } catch {
    // Fallback to uid check if provided
  }

  // 2. Fallback if uid was provided alongside key
  if (fallbackUid) {
    try {
      const userSnap = await getDoc(doc(serverDb, 'users', String(fallbackUid)));
      if (userSnap.exists()) {
        const u = userSnap.data() as any;
        if (u.apiKey === apiKey) {
          return { uid: String(fallbackUid), user: u };
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // ============================================================================
  // 1. SERVER HEALTH & REAL-TIME TELEMETRY (/api/server-status)
  // ============================================================================
  app.get('/api/server-status', (_req: Request, res: Response) => {
    const mem = process.memoryUsage();
    res.json({
      status: 'online',
      uptimeSeconds: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
      serverTime: Date.now(),
      nodeVersion: process.version,
      memoryMB: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      databaseId: firebaseConfig.firestoreDatabaseId,
      apiV2Active: true,
      totalApiCalls: totalApiCallsCounter
    });
  });

  // Live API Traffic & Dispatch Logs
  app.get('/api/provider/logs', (_req: Request, res: Response) => {
    const successCount = apiTrafficLogs.filter(l => l.status === 'success').length;
    const avgLatency =
      apiTrafficLogs.length > 0
        ? Math.round(apiTrafficLogs.reduce((acc, l) => acc + l.latencyMs, 0) / apiTrafficLogs.length)
        : 0;

    res.json({
      status: 'success',
      totalCalls: totalApiCallsCounter,
      successRate: apiTrafficLogs.length > 0 ? Math.round((successCount / apiTrafficLogs.length) * 100) : 100,
      avgLatencyMs: avgLatency,
      logs: apiTrafficLogs
    });
  });

  app.post('/api/provider/clear-logs', (_req: Request, res: Response) => {
    apiTrafficLogs.length = 0;
    res.json({ status: 'success' });
  });

  // ============================================================================
  // 2. SERVER-SIDE SOCIAL LINK VALIDATOR & PLATFORM ANALYZER (/api/analyze-link)
  // ============================================================================
  app.post('/api/analyze-link', async (req: Request, res: Response) => {
    try {
      const { link } = req.body;
      if (!link || typeof link !== 'string') {
        res.status(400).json({ valid: false, error: 'URL link is required' });
        return;
      }

      let parsedUrl: URL;
      try {
        parsedUrl = new URL(link.trim());
      } catch {
        res.status(400).json({ valid: false, error: 'Invalid URL format. Must start with https:// or http://' });
        return;
      }

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        res.status(400).json({ valid: false, error: 'Only HTTP/HTTPS links are supported' });
        return;
      }

      const host = parsedUrl.hostname.toLowerCase();
      let detectedPlatform = 'Other';
      if (host.includes('facebook.com') || host.includes('fb.watch') || host.includes('fb.com')) {
        detectedPlatform = 'Facebook';
      } else if (host.includes('instagram.com') || host.includes('instagr.am')) {
        detectedPlatform = 'Instagram';
      } else if (host.includes('youtube.com') || host.includes('youtu.be')) {
        detectedPlatform = 'YouTube';
      } else if (host.includes('tiktok.com')) {
        detectedPlatform = 'TikTok';
      } else if (host.includes('t.me') || host.includes('telegram.me') || host.includes('telegram.org')) {
        detectedPlatform = 'Telegram';
      } else if (host.includes('twitter.com') || host.includes('x.com')) {
        detectedPlatform = 'Twitter';
      }

      res.json({
        valid: true,
        normalizedUrl: parsedUrl.toString(),
        hostname: host,
        detectedPlatform,
        pathSegments: parsedUrl.pathname.split('/').filter(Boolean),
        verifiedAt: Date.now()
      });
    } catch (error: any) {
      res.status(500).json({ valid: false, error: error?.message || 'Link analysis failed' });
    }
  });

  // ============================================================================
  // 3. ADVANCED SERVER-SIDE UPSTREAM SMM PROVIDER ENGINE (/api/provider/*)
  // ============================================================================

  // Ping & Connection Diagnostics (Latency + Balance + Optional Service Count)
  app.post('/api/provider/ping', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { apiUrl, apiKey, providerName = 'Provider', checkCatalogCount = true } = req.body;
    if (!apiUrl || !apiKey) {
      res.status(400).json({ error: 'Provider apiUrl and apiKey are required' });
      return;
    }

    try {
      const bodyParams = new URLSearchParams({
        key: String(apiKey),
        action: 'balance'
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AmarTrend-SMM-Enterprise/3.0'
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(12000)
      });

      const latencyMs = Date.now() - startTime;
      const data: any = await response.json();

      if (!response.ok || data.error) {
        recordApiLog({
          direction: 'upstream',
          action: 'ping',
          endpoint: providerName,
          status: 'error',
          httpCode: response.status || 400,
          latencyMs,
          summary: data?.error || `HTTP ${response.status}`
        });
        res.status(400).json({
          status: 'error',
          latencyMs,
          error: data?.error || `Upstream provider returned HTTP ${response.status}`
        });
        return;
      }

      let totalRemoteServices: number | undefined;
      if (checkCatalogCount) {
        try {
          const srvResp = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'AmarTrend-SMM-Enterprise/3.0'
            },
            body: new URLSearchParams({ key: String(apiKey), action: 'services' }).toString(),
            signal: AbortSignal.timeout(12000)
          });
          if (srvResp.ok) {
            const srvList: any = await srvResp.json();
            if (Array.isArray(srvList)) {
              totalRemoteServices = srvList.length;
            }
          }
        } catch {
          // Ignore catalog count failure if balance ping succeeded
        }
      }

      recordApiLog({
        direction: 'upstream',
        action: 'ping',
        endpoint: providerName,
        status: 'success',
        httpCode: 200,
        latencyMs,
        summary: `Connected (${latencyMs}ms) · Balance: ${data.balance ?? 0} ${data.currency || 'USD'}`
      });

      res.json({
        status: 'online',
        latencyMs,
        balance: Number(data.balance ?? 0),
        currency: data.currency || 'USD',
        totalRemoteServices
      });
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      recordApiLog({
        direction: 'upstream',
        action: 'ping',
        endpoint: providerName,
        status: 'error',
        httpCode: 502,
        latencyMs,
        summary: error?.message || 'Connection timeout'
      });
      res.status(502).json({
        error: `Connection failed (${latencyMs}ms): ${error?.message || 'Network timeout'}`
      });
    }
  });

  // Check real balance of an upstream SMM provider
  app.post('/api/provider/balance', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { apiUrl, apiKey, providerName = 'Provider' } = req.body;
    try {
      if (!apiUrl || !apiKey) {
        res.status(400).json({ error: 'Provider apiUrl and apiKey are required' });
        return;
      }

      const bodyParams = new URLSearchParams({
        key: String(apiKey),
        action: 'balance'
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AmarTrend-SMM-Enterprise/3.0'
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(12000)
      });

      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        recordApiLog({
          direction: 'upstream',
          action: 'balance',
          endpoint: providerName,
          status: 'error',
          httpCode: response.status,
          latencyMs,
          summary: `HTTP ${response.status} error`
        });
        res.status(502).json({
          error: `Upstream provider returned HTTP ${response.status}`
        });
        return;
      }

      const data: any = await response.json();
      if (data.error) {
        recordApiLog({
          direction: 'upstream',
          action: 'balance',
          endpoint: providerName,
          status: 'error',
          httpCode: 400,
          latencyMs,
          summary: String(data.error)
        });
        res.status(400).json({ error: data.error });
        return;
      }

      recordApiLog({
        direction: 'upstream',
        action: 'balance',
        endpoint: providerName,
        status: 'success',
        httpCode: 200,
        latencyMs,
        summary: `Balance: ${data.balance ?? 0} ${data.currency || 'USD'}`
      });

      res.json({
        status: 'success',
        balance: Number(data.balance ?? 0),
        currency: data.currency || 'USD',
        latencyMs,
        raw: data
      });
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      recordApiLog({
        direction: 'upstream',
        action: 'balance',
        endpoint: providerName,
        status: 'error',
        httpCode: 502,
        latencyMs,
        summary: error?.message || 'Network timeout'
      });
      res.status(502).json({
        error: `Failed to reach upstream provider server: ${error?.message || 'Network timeout'}`
      });
    }
  });

  // Browse Live Remote Catalog from Upstream SMM Provider (For Selective Import & Category Mapping)
  app.post('/api/provider/catalog', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const {
      providerName = 'Upstream Provider',
      apiUrl,
      apiKey,
      profitMargin = 20,
      fixedMarkup = 0,
      priceRounding = 'none',
      currency = 'USD',
      usdToBdtRate = 122
    } = req.body;

    try {
      if (!apiUrl || !apiKey) {
        res.status(400).json({ error: 'Provider apiUrl and apiKey are required' });
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AmarTrend-SMM-Enterprise/3.0'
        },
        body: new URLSearchParams({ key: String(apiKey), action: 'services' }).toString(),
        signal: AbortSignal.timeout(20000)
      });

      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        recordApiLog({
          direction: 'upstream',
          action: 'catalog',
          endpoint: providerName,
          status: 'error',
          httpCode: response.status,
          latencyMs,
          summary: `HTTP ${response.status} while fetching catalog`
        });
        res.status(502).json({ error: `Upstream provider returned HTTP ${response.status}` });
        return;
      }

      const rawServices: any = await response.json();
      if (!Array.isArray(rawServices)) {
        res.status(400).json({
          error: rawServices?.error || 'Upstream provider did not return a valid services array'
        });
        return;
      }

      const categorySet = new Set<string>();
      const catalog = rawServices.map((item: any) => {
        const cat = String(item.category || 'General').trim();
        categorySet.add(cat);
        const rawRate = Number(item.rate || 0);
        const convertedRateBdt = calculateMarkedUpBdtRate(
          rawRate,
          currency,
          usdToBdtRate,
          profitMargin,
          fixedMarkup,
          priceRounding
        );
        const srvId = String(item.service || '');

        return {
          service: srvId,
          name: String(item.name || `Service #${srvId}`),
          category: cat,
          type: item.type === 'Custom Comments' ? 'Custom Comments' : item.type === 'Package' ? 'Package' : 'Default',
          rawRate,
          convertedRateBdt,
          min: Number(item.min || 10),
          max: Number(item.max || 100000),
          dripfeed: Boolean(item.dripfeed),
          refill: Boolean(item.refill),
          cancel: Boolean(item.cancel),
          description: String(item.description || item.desc || `Live API Service #${srvId} from ${providerName}`),
          averageTime: String(item.average_time || item.time || '15-30 minutes')
        };
      });

      recordApiLog({
        direction: 'upstream',
        action: 'catalog',
        endpoint: providerName,
        status: 'success',
        httpCode: 200,
        latencyMs,
        summary: `Loaded ${rawServices.length} remote services across ${categorySet.size} categories`
      });

      res.json({
        status: 'success',
        latencyMs,
        totalAvailable: rawServices.length,
        categories: Array.from(categorySet),
        services: catalog
      });
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      recordApiLog({
        direction: 'upstream',
        action: 'catalog',
        endpoint: providerName,
        status: 'error',
        httpCode: 502,
        latencyMs,
        summary: error?.message || 'Catalog fetch failed'
      });
      res.status(502).json({
        error: `Failed to fetch remote catalog: ${error?.message || 'Connection failed'}`
      });
    }
  });

  // Fetch & transform real services catalog from upstream SMM provider for import
  app.post('/api/provider/services', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const {
      providerId,
      providerName,
      apiUrl,
      apiKey,
      profitMargin = 20,
      fixedMarkup = 0,
      priceRounding = 'none',
      currency = 'USD',
      usdToBdtRate = 122,
      limit = 0,
      selectedCategories,
      selectedServiceIds,
      customCategoryName
    } = req.body;

    try {
      if (!apiUrl || !apiKey) {
        res.status(400).json({ error: 'Provider apiUrl and apiKey are required' });
        return;
      }

      const bodyParams = new URLSearchParams({
        key: String(apiKey),
        action: 'services'
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AmarTrend-SMM-Enterprise/3.0'
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(25000)
      });

      const latencyMs = Date.now() - startTime;
      if (!response.ok) {
        res.status(502).json({
          error: `Upstream provider returned HTTP ${response.status}`
        });
        return;
      }

      const rawServices: any = await response.json();
      if (!Array.isArray(rawServices)) {
        res.status(400).json({
          error: rawServices?.error || 'Upstream provider did not return a valid services array'
        });
        return;
      }

      let filteredRaw = rawServices;
      if (Array.isArray(selectedServiceIds) && selectedServiceIds.length > 0) {
        const idSet = new Set(selectedServiceIds.map((id: any) => String(id)));
        filteredRaw = filteredRaw.filter((item: any) => idSet.has(String(item.service)));
      } else if (Array.isArray(selectedCategories) && selectedCategories.length > 0) {
        const catSet = new Set(selectedCategories.map((c: any) => String(c)));
        filteredRaw = filteredRaw.filter((item: any) => catSet.has(String(item.category || 'General').trim()));
      }

      const numericLimit = Number(limit || 0);
      const servicesToMap = numericLimit > 0 ? filteredRaw.slice(0, numericLimit) : filteredRaw;

      const mappedServices = servicesToMap.map((item: any) => {
        const rawRate = Number(item.rate || 0);
        const bdtRate = calculateMarkedUpBdtRate(
          rawRate,
          currency,
          usdToBdtRate,
          profitMargin,
          fixedMarkup,
          priceRounding
        );
        const srvId = String(item.service || Math.floor(1000 + Math.random() * 9000));
        const cleanProvPrefix = (providerId || 'api').replace(/[^a-zA-Z0-9]/g, '').slice(-4);

        return {
          id: `srv-${cleanProvPrefix}-${srvId}`,
          category: customCategoryName?.trim() ? customCategoryName.trim() : String(item.category || 'General'),
          name: String(item.name || `Service #${srvId}`),
          type: item.type === 'Custom Comments' ? 'Custom Comments' : item.type === 'Package' ? 'Package' : 'Default',
          rate: bdtRate,
          originalRate: rawRate,
          min: Number(item.min || 10),
          max: Number(item.max || 100000),
          dripfeed: Boolean(item.dripfeed),
          refill: Boolean(item.refill),
          description: String(
            item.description ||
              item.desc ||
              `Synced live from ${providerName || 'Upstream SMM Provider'} (Service ID: #${srvId}).`
          ),
          averageTime: String(item.average_time || item.time || '15-30 minutes'),
          status: 'active',
          providerId: providerId || 'external',
          providerServiceId: srvId
        };
      });

      recordApiLog({
        direction: 'upstream',
        action: 'services_import',
        endpoint: providerName || 'Provider',
        status: 'success',
        httpCode: 200,
        latencyMs,
        summary: `Imported ${mappedServices.length} / ${rawServices.length} services (+${profitMargin}% margin)`
      });

      res.json({
        status: 'success',
        totalAvailable: rawServices.length,
        importedCount: mappedServices.length,
        services: mappedServices
      });
    } catch (error: any) {
      res.status(502).json({
        error: `Failed to fetch services from provider server: ${error?.message || 'Connection failed'}`
      });
    }
  });

  // Forward an order to an upstream SMM provider API
  app.post('/api/provider/order', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const {
      providerName = 'Provider',
      apiUrl,
      apiKey,
      providerServiceId,
      link,
      quantity,
      runs,
      interval,
      customComments
    } = req.body;

    try {
      if (!apiUrl || !apiKey || !providerServiceId || !link || !quantity) {
        res.status(400).json({ error: 'Missing required upstream order parameters' });
        return;
      }

      const params: Record<string, string> = {
        key: String(apiKey),
        action: 'add',
        service: String(providerServiceId),
        link: String(link),
        quantity: String(quantity)
      };

      if (runs) params.runs = String(runs);
      if (interval) params.interval = String(interval);
      if (customComments) params.comments = String(customComments);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AmarTrend-SMM-Enterprise/3.0'
        },
        body: new URLSearchParams(params).toString(),
        signal: AbortSignal.timeout(15000)
      });

      const latencyMs = Date.now() - startTime;
      const data: any = await response.json();
      if (data.error) {
        recordApiLog({
          direction: 'upstream',
          action: 'add_order',
          endpoint: providerName,
          status: 'error',
          httpCode: 400,
          latencyMs,
          summary: `Order rejected: ${data.error}`
        });
        res.status(400).json({ error: data.error });
        return;
      }

      const providerOrderId = String(data.order || data.id || '');
      recordApiLog({
        direction: 'upstream',
        action: 'add_order',
        endpoint: providerName,
        status: 'success',
        httpCode: 200,
        latencyMs,
        summary: `Dispatched Service #${providerServiceId} -> Upstream Order #${providerOrderId}`
      });

      res.json({
        status: 'success',
        providerOrderId,
        latencyMs,
        raw: data
      });
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      recordApiLog({
        direction: 'upstream',
        action: 'add_order',
        endpoint: providerName,
        status: 'error',
        httpCode: 502,
        latencyMs,
        summary: error?.message || 'Order dispatch network error'
      });
      res.status(502).json({
        error: `Upstream order dispatch failed: ${error?.message || 'Network error'}`
      });
    }
  });

  // Check single live order status from upstream SMM provider API
  app.post('/api/provider/status', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { providerName = 'Provider', apiUrl, apiKey, providerOrderId } = req.body;
    try {
      if (!apiUrl || !apiKey || !providerOrderId) {
        res.status(400).json({ error: 'apiUrl, apiKey, and providerOrderId are required' });
        return;
      }

      const bodyParams = new URLSearchParams({
        key: String(apiKey),
        action: 'status',
        order: String(providerOrderId)
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AmarTrend-SMM-Enterprise/3.0'
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(12000)
      });

      const latencyMs = Date.now() - startTime;
      const data: any = await response.json();
      if (data.error) {
        res.status(400).json({ error: data.error });
        return;
      }

      const mappedStatus = mapRawStatusToEnum(data.status);
      recordApiLog({
        direction: 'upstream',
        action: 'status',
        endpoint: providerName,
        status: 'success',
        httpCode: 200,
        latencyMs,
        summary: `Order #${providerOrderId} -> ${mappedStatus.toUpperCase()}`
      });

      res.json({
        status: 'success',
        mappedStatus,
        startCount: data.start_count !== undefined ? Number(data.start_count) : undefined,
        remains: data.remains !== undefined ? Number(data.remains) : undefined,
        charge: data.charge,
        raw: data
      });
    } catch (error: any) {
      res.status(502).json({
        error: `Upstream status check failed: ${error?.message || 'Network error'}`
      });
    }
  });

  // Batch Multi-Order Status Sync (Up to 100 orders in a single call!)
  app.post('/api/provider/multi-status', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { providerName = 'Provider', apiUrl, apiKey, providerOrderIds } = req.body;
    try {
      if (!apiUrl || !apiKey || !Array.isArray(providerOrderIds) || providerOrderIds.length === 0) {
        res.status(400).json({ error: 'apiUrl, apiKey, and providerOrderIds array are required' });
        return;
      }

      const cleanIds = providerOrderIds.map((id: any) => String(id).trim()).filter(Boolean).slice(0, 100);
      const bodyParams = new URLSearchParams({
        key: String(apiKey),
        action: 'status',
        orders: cleanIds.join(',')
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AmarTrend-SMM-Enterprise/3.0'
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(15000)
      });

      const latencyMs = Date.now() - startTime;
      const data: any = await response.json();

      const results: Record<
        string,
        { mappedStatus: string; startCount?: number; remains?: number; charge?: string }
      > = {};

      if (data && typeof data === 'object' && !data.error) {
        for (const id of cleanIds) {
          const item = data[id];
          if (item && !item.error && item.status) {
            results[id] = {
              mappedStatus: mapRawStatusToEnum(item.status),
              startCount: item.start_count !== undefined ? Number(item.start_count) : undefined,
              remains: item.remains !== undefined ? Number(item.remains) : undefined,
              charge: item.charge !== undefined ? String(item.charge) : undefined
            };
          }
        }
      }

      recordApiLog({
        direction: 'upstream',
        action: 'multi_status',
        endpoint: providerName,
        status: 'success',
        httpCode: 200,
        latencyMs,
        summary: `Batch synced ${Object.keys(results).length}/${cleanIds.length} orders`
      });

      res.json({
        status: 'success',
        latencyMs,
        results
      });
    } catch (error: any) {
      res.status(502).json({
        error: `Batch status sync failed: ${error?.message || 'Network error'}`
      });
    }
  });

  // Forward Refill Request to Upstream SMM Provider
  app.post('/api/provider/refill', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { providerName = 'Provider', apiUrl, apiKey, providerOrderId } = req.body;
    try {
      if (!apiUrl || !apiKey || !providerOrderId) {
        res.status(400).json({ error: 'apiUrl, apiKey, and providerOrderId are required' });
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AmarTrend-SMM-Enterprise/3.0'
        },
        body: new URLSearchParams({
          key: String(apiKey),
          action: 'refill',
          order: String(providerOrderId)
        }).toString(),
        signal: AbortSignal.timeout(12000)
      });

      const latencyMs = Date.now() - startTime;
      const data: any = await response.json();
      if (data.error) {
        recordApiLog({
          direction: 'upstream',
          action: 'refill',
          endpoint: providerName,
          status: 'error',
          httpCode: 400,
          latencyMs,
          summary: `Refill error for #${providerOrderId}: ${data.error}`
        });
        res.status(400).json({ error: data.error });
        return;
      }

      recordApiLog({
        direction: 'upstream',
        action: 'refill',
        endpoint: providerName,
        status: 'success',
        httpCode: 200,
        latencyMs,
        summary: `Triggered upstream refill for Order #${providerOrderId} -> Refill #${data.refill || 'OK'}`
      });

      res.json({
        status: 'success',
        providerRefillId: String(data.refill || ''),
        raw: data
      });
    } catch (error: any) {
      res.status(502).json({
        error: `Upstream refill request failed: ${error?.message || 'Network error'}`
      });
    }
  });

  // Forward Cancel Request to Upstream SMM Provider
  app.post('/api/provider/cancel', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { providerName = 'Provider', apiUrl, apiKey, providerOrderId } = req.body;
    try {
      if (!apiUrl || !apiKey || !providerOrderId) {
        res.status(400).json({ error: 'apiUrl, apiKey, and providerOrderId are required' });
        return;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AmarTrend-SMM-Enterprise/3.0'
        },
        body: new URLSearchParams({
          key: String(apiKey),
          action: 'cancel',
          orders: String(providerOrderId)
        }).toString(),
        signal: AbortSignal.timeout(12000)
      });

      const latencyMs = Date.now() - startTime;
      const data: any = await response.json();

      recordApiLog({
        direction: 'upstream',
        action: 'cancel',
        endpoint: providerName,
        status: data?.error ? 'error' : 'success',
        httpCode: response.status,
        latencyMs,
        summary: `Cancel request sent for Upstream Order #${providerOrderId}`
      });

      res.json({
        status: 'success',
        raw: data
      });
    } catch (error: any) {
      res.status(502).json({
        error: `Upstream cancel request failed: ${error?.message || 'Network error'}`
      });
    }
  });

  // Admin Raw Provider Payload Sandbox Tester
  app.post('/api/provider/raw-test', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { providerName = 'Provider', apiUrl, apiKey, action = 'balance', extraParams = {} } = req.body;
    try {
      if (!apiUrl || !apiKey) {
        res.status(400).json({ error: 'apiUrl and apiKey are required' });
        return;
      }

      const params: Record<string, string> = {
        key: String(apiKey),
        action: String(action)
      };
      for (const [k, v] of Object.entries(extraParams)) {
        if (v !== undefined && v !== null && String(v).trim() !== '') {
          params[k] = String(v);
        }
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'AmarTrend-SMM-Enterprise/3.0'
        },
        body: new URLSearchParams(params).toString(),
        signal: AbortSignal.timeout(15000)
      });

      const latencyMs = Date.now() - startTime;
      const text = await response.text();
      let parsed: any = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // Keep raw text if not valid JSON
      }

      recordApiLog({
        direction: 'upstream',
        action: `raw:${action}`,
        endpoint: providerName,
        status: response.ok ? 'success' : 'error',
        httpCode: response.status,
        latencyMs,
        summary: `Raw test [action=${action}] -> HTTP ${response.status} (${latencyMs}ms)`
      });

      res.json({
        status: response.ok ? 'success' : 'error',
        httpCode: response.status,
        latencyMs,
        response: Array.isArray(parsed) ? { totalItems: parsed.length, previewFirst10: parsed.slice(0, 10) } : parsed
      });
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      res.status(502).json({
        status: 'error',
        httpCode: 502,
        latencyMs,
        error: error?.message || 'Raw request failed'
      });
    }
  });

  // ============================================================================
  // 4. PUBLIC SMM PANEL API v2 ENDPOINT (/api/v2)
  //    Full Industry-Standard Reseller & Child-Panel REST API v2
  // ============================================================================
  const handleApiV2 = async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const payload = { ...req.query, ...req.body };
      const action = String(payload.action || '').toLowerCase().trim();
      const apiKey = String(payload.key || '').trim();
      const uidParam = payload.uid ? String(payload.uid).trim() : undefined;

      if (!action) {
        res.status(400).json({
          error: 'Parameter "action" is required (services, balance, add, status, orders, refill, refill_status, cancel)'
        });
        return;
      }

      // 1. Action: services (Lists real active services from Firestore server)
      if (action === 'services') {
        const snap = await getDocs(collection(serverDb, 'services'));
        const services = snap.docs
          .map(d => ({ ...d.data(), id: d.id } as any))
          .filter(s => s.status !== 'disabled')
          .map(s => ({
            service: s.id,
            name: s.name,
            type: s.type || 'Default',
            category: s.category,
            rate: String(s.rate),
            min: String(s.min),
            max: String(s.max),
            dripfeed: Boolean(s.dripfeed),
            refill: Boolean(s.refill),
            cancel: true,
            desc: s.description || ''
          }));

        recordApiLog({
          direction: 'inbound_v2',
          action: 'services',
          endpoint: '/api/v2',
          status: 'success',
          httpCode: 200,
          latencyMs: Date.now() - startTime,
          summary: `Returned ${services.length} active services`
        });

        res.json(services);
        return;
      }

      // 2. Action: balance (Verifies API key via api_keys index & returns live user balance)
      if (action === 'balance') {
        if (!apiKey) {
          res.status(401).json({ error: 'Invalid or missing API key' });
          return;
        }

        const resolved = await resolveUserByApiKey(apiKey, uidParam);
        if (!resolved) {
          recordApiLog({
            direction: 'inbound_v2',
            action: 'balance',
            endpoint: '/api/v2',
            status: 'error',
            httpCode: 401,
            latencyMs: Date.now() - startTime,
            summary: 'Unauthorized API key'
          });
          res.status(401).json({ error: 'Invalid API key or unauthorized request' });
          return;
        }

        const u = resolved.user;
        recordApiLog({
          direction: 'inbound_v2',
          action: 'balance',
          endpoint: '/api/v2',
          status: 'success',
          httpCode: 200,
          latencyMs: Date.now() - startTime,
          summary: `User ${u.email || resolved.uid} balance checked (${(u.balance ?? 0).toFixed(2)} BDT)`
        });

        res.json({
          status: 'success',
          balance: String((u.balance ?? 0).toFixed(2)),
          total_spent: String((u.totalSpent ?? 0).toFixed(2)),
          currency: 'BDT',
          server_timestamp: Date.now()
        });
        return;
      }

      // 3. Action: status or orders (Single Order Status OR Multi-Order Comma-Separated Status)
      if (action === 'status' || action === 'orders') {
        const multiOrdersRaw = String(payload.orders || '').trim();
        const singleOrderId = String(payload.order || '').trim();

        // Multi-order status check: orders=ORD-1,ORD-2,ORD-3
        if (multiOrdersRaw || action === 'orders') {
          const ids = (multiOrdersRaw || singleOrderId)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .slice(0, 100);

          if (ids.length === 0) {
            res.status(400).json({ error: 'Parameter "orders" (comma-separated order IDs) is required' });
            return;
          }

          const results: Record<string, any> = {};
          await Promise.all(
            ids.map(async id => {
              const snap = await getDoc(doc(serverDb, 'orders', id));
              if (!snap.exists()) {
                results[id] = { error: 'Incorrect order ID' };
              } else {
                const ord = snap.data() as any;
                results[id] = {
                  charge: String(ord.charge ?? 0),
                  start_count: String(ord.startCount ?? 0),
                  status: ord.status,
                  remains: String(ord.remains ?? 0),
                  currency: 'BDT'
                };
              }
            })
          );

          recordApiLog({
            direction: 'inbound_v2',
            action: 'multi_status',
            endpoint: '/api/v2',
            status: 'success',
            httpCode: 200,
            latencyMs: Date.now() - startTime,
            summary: `Multi-status queried for ${ids.length} orders`
          });

          res.json(results);
          return;
        }

        // Single order status check
        if (!singleOrderId) {
          res.status(400).json({ error: 'Parameter "order" is required' });
          return;
        }

        const orderSnap = await getDoc(doc(serverDb, 'orders', singleOrderId));
        if (!orderSnap.exists()) {
          res.status(404).json({ error: `Order #${singleOrderId} not found on server` });
          return;
        }

        const ord = orderSnap.data() as any;
        recordApiLog({
          direction: 'inbound_v2',
          action: 'status',
          endpoint: '/api/v2',
          status: 'success',
          httpCode: 200,
          latencyMs: Date.now() - startTime,
          summary: `Order #${singleOrderId} status: ${ord.status}`
        });

        res.json({
          order: orderSnap.id,
          status: ord.status,
          charge: String(ord.charge ?? 0),
          start_count: String(ord.startCount ?? 0),
          remains: String(ord.remains ?? 0),
          currency: 'BDT'
        });
        return;
      }

      // 4. Action: add (Validates API key, service, link, quantity, and user balance on server)
      if (action === 'add') {
        if (!apiKey) {
          res.status(401).json({ error: 'Invalid or missing API key' });
          return;
        }

        const resolved = await resolveUserByApiKey(apiKey, uidParam);
        if (!resolved) {
          res.status(401).json({ error: 'Invalid API key' });
          return;
        }

        const serviceId = String(payload.service || '').trim();
        const link = String(payload.link || '').trim();
        const quantity = Number(payload.quantity || 0);
        const runs = payload.runs ? Number(payload.runs) : undefined;
        const interval = payload.interval ? Number(payload.interval) : undefined;

        if (!serviceId || !link || !quantity || quantity <= 0) {
          res.status(400).json({ error: 'Parameters "service", "link", and valid "quantity" are required' });
          return;
        }

        const srvSnap = await getDoc(doc(serverDb, 'services', serviceId));
        if (!srvSnap.exists()) {
          res.status(404).json({ error: `Service "${serviceId}" not found` });
          return;
        }

        const srv = srvSnap.data() as any;
        if (srv.status === 'disabled') {
          res.status(400).json({ error: `Service "${serviceId}" is currently disabled` });
          return;
        }

        if (quantity < Number(srv.min || 1) || quantity > Number(srv.max || 1000000)) {
          res.status(400).json({
            error: `Quantity must be between ${srv.min} and ${srv.max} for service ${serviceId}`
          });
          return;
        }

        const totalQuantity = runs && runs > 1 ? quantity * runs : quantity;
        const charge = Number(((totalQuantity / 1000) * Number(srv.rate || 0)).toFixed(2));
        const userBalance = Number(resolved.user.balance || 0);

        if (userBalance < charge) {
          res.status(400).json({
            error: `Insufficient balance (${userBalance.toFixed(2)} BDT) for order charge (${charge.toFixed(2)} BDT)`
          });
          return;
        }

        const generatedOrderId = String(payload.clientOrderId || 'ORD-' + Math.floor(100000 + Math.random() * 900000));

        recordApiLog({
          direction: 'inbound_v2',
          action: 'add',
          endpoint: '/api/v2',
          status: 'success',
          httpCode: 200,
          latencyMs: Date.now() - startTime,
          summary: `API Order #${generatedOrderId} validated (${serviceId} · Qty: ${totalQuantity} · ৳${charge})`
        });

        res.json({
          status: 'success',
          order: generatedOrderId,
          service: serviceId,
          service_name: srv.name,
          category: srv.category,
          link,
          quantity: totalQuantity,
          charge: String(charge),
          currency: 'BDT',
          runs,
          interval
        });
        return;
      }

      // 5. Action: refill (Validates order for refill via API v2)
      if (action === 'refill') {
        const orderId = String(payload.order || '').trim();
        if (!orderId) {
          res.status(400).json({ error: 'Parameter "order" is required' });
          return;
        }

        const orderSnap = await getDoc(doc(serverDb, 'orders', orderId));
        if (!orderSnap.exists()) {
          res.status(404).json({ error: `Order #${orderId} not found` });
          return;
        }

        const refillId = 'REF-' + Math.floor(10000 + Math.random() * 90000);
        recordApiLog({
          direction: 'inbound_v2',
          action: 'refill',
          endpoint: '/api/v2',
          status: 'success',
          httpCode: 200,
          latencyMs: Date.now() - startTime,
          summary: `Refill #${refillId} requested for Order #${orderId}`
        });

        res.json({
          refill: refillId,
          order: orderId,
          status: 'pending'
        });
        return;
      }

      // 6. Action: refill_status (Checks refill status by ID)
      if (action === 'refill_status') {
        const refillId = String(payload.refill || '').trim();
        if (!refillId) {
          res.status(400).json({ error: 'Parameter "refill" is required' });
          return;
        }

        const refSnap = await getDoc(doc(serverDb, 'refills', refillId));
        if (!refSnap.exists()) {
          res.status(404).json({ error: `Refill #${refillId} not found` });
          return;
        }

        const rData = refSnap.data() as any;
        res.json({
          refill: refillId,
          order: rData.orderId,
          status: rData.status
        });
        return;
      }

      // 7. Action: cancel (Requests order cancellation via API v2)
      if (action === 'cancel') {
        const orderId = String(payload.order || payload.orders || '').split(',')[0].trim();
        if (!orderId) {
          res.status(400).json({ error: 'Parameter "order" or "orders" is required' });
          return;
        }

        const orderSnap = await getDoc(doc(serverDb, 'orders', orderId));
        if (!orderSnap.exists()) {
          res.status(404).json({ error: `Order #${orderId} not found` });
          return;
        }

        const ord = orderSnap.data() as any;
        const canCancel = ['pending', 'processing'].includes(ord.status);

        recordApiLog({
          direction: 'inbound_v2',
          action: 'cancel',
          endpoint: '/api/v2',
          status: canCancel ? 'success' : 'error',
          httpCode: canCancel ? 200 : 400,
          latencyMs: Date.now() - startTime,
          summary: `Cancel request for #${orderId} (${canCancel ? 'Eligible' : 'Already ' + ord.status})`
        });

        if (!canCancel) {
          res.status(400).json({
            order: orderId,
            cancel: { error: `Order in "${ord.status}" state cannot be canceled automatically` }
          });
          return;
        }

        res.json({
          order: orderId,
          cancel: 1,
          status: 'canceled'
        });
        return;
      }

      res.status(400).json({
        error: `Unsupported action "${action}". Supported actions: services, balance, add, status, orders, refill, refill_status, cancel`
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Internal Server Error' });
    }
  };

  app.post('/api/v2', handleApiV2);
  app.get('/api/v2', handleApiV2);

  // ============================================================================
  // 5. ZINIPAY AUTOMATED PAYMENT GATEWAY ENGINE (/api/zinipay/*)
  //    Supports:
  //    - Hosted Invoice API: POST /v1/payment/create & POST /v1/payment/verify
  //    - 2-Step Transaction Verification API: POST /v1/trx/verify & POST /v1/trx/confirm
  //    - Multi-Route Failover: api.zinipay.com -> api2 -> api3 -> api4
  //    - Interactive Sandbox Simulator & Real-Time Webhook Listener
  // ============================================================================

  interface ZiniPayLogItem {
    id: string;
    timestamp: number;
    type: 'create_invoice' | 'verify_invoice' | 'trx_verify' | 'trx_confirm' | 'webhook' | 'ping';
    mode: 'sandbox' | 'live';
    status: 'success' | 'error' | 'pending';
    invoiceId?: string;
    transactionId?: string;
    amount?: number;
    latencyMs: number;
    summary: string;
  }

  interface SandboxInvoiceSession {
    invoiceId: string;
    paymentId: string;
    userId: string;
    userEmail: string;
    cusName: string;
    amount: number;
    bonus: number;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    paymentMethod: string;
    senderNumber: string;
    transactionId: string;
    createdAt: number;
    completedAt?: number;
  }

  const zinipayLogs: ZiniPayLogItem[] = [];
  const sandboxInvoices = new Map<string, SandboxInvoiceSession>();
  const webhookVerifiedTrx = new Map<string, { amount: number; senderNumber: string; provider: string; timestamp: number }>();
  const confirmedTrxIds = new Set<string>();

  function recordZiniPayLog(entry: Omit<ZiniPayLogItem, 'id' | 'timestamp'>) {
    const item: ZiniPayLogItem = {
      id: 'zini-log-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
      timestamp: Date.now(),
      ...entry
    };
    zinipayLogs.unshift(item);
    if (zinipayLogs.length > 100) {
      zinipayLogs.pop();
    }
  }

  async function resolveZiniPaySettings(overrides?: Record<string, any>) {
    let dbSettings: Record<string, any> = {};
    try {
      const snap = await getDoc(doc(serverDb, 'settings', 'global'));
      if (snap.exists()) {
        dbSettings = snap.data() || {};
      }
    } catch {
      // fallback to defaults
    }

    const mode: 'sandbox' | 'live' =
      (overrides?.zinipayMode || dbSettings.zinipayMode || process.env.ZINIPAY_MODE || 'sandbox') === 'live'
        ? 'live'
        : 'sandbox';
    const apiKey = String(
      overrides?.zinipayApiKey ?? dbSettings.zinipayApiKey ?? process.env.ZINIPAY_API_KEY ?? ''
    ).trim();
    const baseUrl = String(
      overrides?.zinipayBaseUrl || dbSettings.zinipayBaseUrl || 'https://api.zinipay.com'
    )
      .trim()
      .replace(/\/+$/, '');
    const brandDomain = String(
      overrides?.zinipayBrandDomain ?? dbSettings.zinipayBrandDomain ?? ''
    ).trim();
    const enabled = overrides?.zinipayEnabled ?? dbSettings.zinipayEnabled ?? true;
    const autoVerifyTrx = overrides?.zinipayAutoVerifyTrx ?? dbSettings.zinipayAutoVerifyTrx ?? true;

    return { mode, apiKey, baseUrl, brandDomain, enabled, autoVerifyTrx };
  }

  async function callZiniPayWithFailover(
    primaryBaseUrl: string,
    pathSuffix: string,
    apiKey: string,
    payload: Record<string, any>
  ): Promise<{ ok: boolean; status: number; data: any; usedUrl: string; latencyMs: number }> {
    const startTime = Date.now();
    const candidateBases = Array.from(
      new Set([
        primaryBaseUrl,
        'https://api.zinipay.com',
        'https://api2.zinipay.com',
        'https://api3.zinipay.com',
        'https://api4.zinipay.com'
      ])
    );

    let lastErrorData: any = { message: 'ZiniPay API request failed' };
    let lastStatus = 500;
    let lastUrl = candidateBases[0] + pathSuffix;

    for (const base of candidateBases) {
      const fullUrl = `${base.replace(/\/+$/, '')}${pathSuffix}`;
      lastUrl = fullUrl;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 9000);
        const resp = await fetch(fullUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'zini-api-key': apiKey,
            'zinipay-api-key': apiKey,
            'User-Agent': 'AmarTrend-ZiniPay-Gateway/2.0'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timer);

        lastStatus = resp.status;
        const text = await resp.text();
        let parsed: any = {};
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = { raw: text };
        }

        if (resp.ok) {
          return {
            ok: true,
            status: resp.status,
            data: parsed,
            usedUrl: fullUrl,
            latencyMs: Date.now() - startTime
          };
        }

        lastErrorData = parsed;
        // If 4xx client error (e.g. invalid API key or domain mismatch), don't retry all 4 failover servers unnecessarily
        if (resp.status >= 400 && resp.status < 500) {
          break;
        }
      } catch (err: any) {
        lastErrorData = { message: err?.message || 'Network connection error to ZiniPay node' };
      }
    }

    return {
      ok: false,
      status: lastStatus,
      data: lastErrorData,
      usedUrl: lastUrl,
      latencyMs: Date.now() - startTime
    };
  }

  // 5.1 Create ZiniPay Hosted Invoice (/api/zinipay/create -> POST /v1/payment/create)
  app.post('/api/zinipay/create', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const {
        amount,
        bonus = 0,
        paymentId,
        userId,
        userEmail,
        cusName,
        preferredMethod = 'bKash',
        originUrl = ''
      } = req.body;

      const numAmount = Number(amount);
      if (!numAmount || numAmount <= 0) {
        res.status(400).json({ error: 'Valid deposit amount greater than 0 is required' });
        return;
      }

      const cfg = await resolveZiniPaySettings();
      if (!cfg.enabled) {
        res.status(400).json({ error: 'ZiniPay gateway is currently disabled by administrator' });
        return;
      }

      const effectiveDomain = cfg.brandDomain
        ? cfg.brandDomain.startsWith('http')
          ? cfg.brandDomain.replace(/\/+$/, '')
          : `https://${cfg.brandDomain.replace(/\/+$/, '')}`
        : originUrl || `${req.protocol}://${req.get('host')}`;

      const generatedInvoiceId = 'ZINI-' + Date.now().toString(36).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);

      const createPayload = {
        amount: String(numAmount),
        cus_name: cusName || (userEmail ? String(userEmail).split('@')[0] : 'Customer'),
        cus_email: userEmail || 'customer@amartrend.com',
        metadata: {
          paymentId: paymentId || generatedInvoiceId,
          userId: userId || '',
          bonus: String(bonus || 0),
          preferredMethod
        },
        redirect_url: `${effectiveDomain}/?zinipay_status=success&payment_id=${encodeURIComponent(paymentId || '')}`,
        cancel_url: `${effectiveDomain}/?zinipay_status=cancel&payment_id=${encodeURIComponent(paymentId || '')}`,
        webhook_url: `${effectiveDomain}/api/zinipay/webhook`
      };

      // If API Key is configured, attempt calling real ZiniPay /v1/payment/create endpoint
      if (cfg.apiKey) {
        const apiResult = await callZiniPayWithFailover(
          cfg.baseUrl,
          '/v1/payment/create',
          cfg.apiKey,
          createPayload
        );

        const paymentUrl =
          apiResult.data?.payment_url ||
          apiResult.data?.data?.payment_url ||
          apiResult.data?.url ||
          '';
        const remoteInvoiceId =
          apiResult.data?.invoice_id ||
          apiResult.data?.invoiceId ||
          apiResult.data?.data?.invoice_id ||
          apiResult.data?.val_id ||
          generatedInvoiceId;

        if (apiResult.ok && paymentUrl) {
          // Also register in local map so we can track metadata
          sandboxInvoices.set(String(remoteInvoiceId), {
            invoiceId: String(remoteInvoiceId),
            paymentId: String(paymentId || ''),
            userId: String(userId || ''),
            userEmail: String(userEmail || ''),
            cusName: createPayload.cus_name,
            amount: numAmount,
            bonus: Number(bonus || 0),
            status: 'PENDING',
            paymentMethod: preferredMethod,
            senderNumber: '',
            transactionId: '',
            createdAt: Date.now()
          });

          recordZiniPayLog({
            type: 'create_invoice',
            mode: cfg.mode,
            status: 'success',
            invoiceId: String(remoteInvoiceId),
            amount: numAmount,
            latencyMs: apiResult.latencyMs,
            summary: `ZiniPay Invoice #${remoteInvoiceId} created (৳${numAmount}) via ${apiResult.usedUrl}`
          });

          res.json({
            status: true,
            mode: cfg.mode,
            sandboxSimulation: false,
            invoiceId: String(remoteInvoiceId),
            paymentUrl: String(paymentUrl),
            amount: numAmount,
            bonus: Number(bonus || 0),
            message: apiResult.data?.message || 'ZiniPay checkout invoice created successfully'
          });
          return;
        }

        // If Live mode failed and user did NOT enable sandbox mode, report the exact ZiniPay API error
        if (cfg.mode === 'live') {
          const errMsg =
            apiResult.data?.message ||
            apiResult.data?.error ||
            'ZiniPay Live API rejected invoice creation. Check Brand API Key & Brand Website Domain in Admin Settings.';
          recordZiniPayLog({
            type: 'create_invoice',
            mode: 'live',
            status: 'error',
            amount: numAmount,
            latencyMs: apiResult.latencyMs,
            summary: `Live create failed: ${errMsg}`
          });
          res.status(400).json({ error: errMsg, details: apiResult.data });
          return;
        }
      } else if (cfg.mode === 'live') {
        res.status(400).json({
          error: 'ZiniPay Live Brand API Key is not configured yet. Please add your zini-api-key in Admin Settings or switch to Sandbox mode.'
        });
        return;
      }

      // Sandbox Mode Interactive Checkout Session
      const sbxSession: SandboxInvoiceSession = {
        invoiceId: generatedInvoiceId,
        paymentId: String(paymentId || ''),
        userId: String(userId || ''),
        userEmail: String(userEmail || ''),
        cusName: createPayload.cus_name,
        amount: numAmount,
        bonus: Number(bonus || 0),
        status: 'PENDING',
        paymentMethod: preferredMethod,
        senderNumber: '',
        transactionId: '',
        createdAt: Date.now()
      };
      sandboxInvoices.set(generatedInvoiceId, sbxSession);

      recordZiniPayLog({
        type: 'create_invoice',
        mode: 'sandbox',
        status: 'success',
        invoiceId: generatedInvoiceId,
        amount: numAmount,
        latencyMs: Date.now() - startTime,
        summary: `ZiniPay Sandbox Invoice #${generatedInvoiceId} initialized (৳${numAmount} · ${preferredMethod})`
      });

      res.json({
        status: true,
        mode: 'sandbox',
        sandboxSimulation: true,
        invoiceId: generatedInvoiceId,
        paymentUrl: `${effectiveDomain}/?zinipay_sandbox_invoice=${generatedInvoiceId}`,
        amount: numAmount,
        bonus: Number(bonus || 0),
        message: 'ZiniPay Sandbox Invoice initialized'
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Failed to create ZiniPay invoice' });
    }
  });

  // 5.2 Complete Interactive Sandbox Invoice (/api/zinipay/sandbox-complete)
  app.post('/api/zinipay/sandbox-complete', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const { invoiceId, paymentMethod = 'bKash', senderNumber = '01700000000', transactionId, action = 'complete' } = req.body;
      if (!invoiceId) {
        res.status(400).json({ error: 'invoiceId is required' });
        return;
      }

      const session = sandboxInvoices.get(String(invoiceId));
      if (!session) {
        res.status(404).json({ error: `Sandbox invoice #${invoiceId} not found or expired` });
        return;
      }

      if (action === 'cancel') {
        session.status = 'CANCELLED';
        sandboxInvoices.set(String(invoiceId), session);
        recordZiniPayLog({
          type: 'verify_invoice',
          mode: 'sandbox',
          status: 'error',
          invoiceId: String(invoiceId),
          amount: session.amount,
          latencyMs: Date.now() - startTime,
          summary: `Sandbox Invoice #${invoiceId} canceled by user`
        });
        res.json({ status: 'CANCELLED', invoiceId });
        return;
      }

      const finalTrxId =
        (transactionId && String(transactionId).trim().toUpperCase()) ||
        'ZINI' + Math.floor(10000000 + Math.random() * 90000000).toString();

      session.status = 'COMPLETED';
      session.paymentMethod = String(paymentMethod || 'bKash');
      session.senderNumber = String(senderNumber || '01700000000');
      session.transactionId = finalTrxId;
      session.completedAt = Date.now();
      sandboxInvoices.set(String(invoiceId), session);

      recordZiniPayLog({
        type: 'webhook',
        mode: 'sandbox',
        status: 'success',
        invoiceId: String(invoiceId),
        transactionId: finalTrxId,
        amount: session.amount,
        latencyMs: Date.now() - startTime,
        summary: `Sandbox Payment Completed: #${invoiceId} · ${session.paymentMethod} · TrxID: ${finalTrxId} · ৳${session.amount}`
      });

      res.json({
        status: 'COMPLETED',
        verified: true,
        invoiceId: session.invoiceId,
        transactionId: session.transactionId,
        senderNumber: session.senderNumber,
        paymentMethod: session.paymentMethod,
        amount: session.amount
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Sandbox completion failed' });
    }
  });

  // 5.3 Verify ZiniPay Invoice (/api/zinipay/verify -> POST /v1/payment/verify)
  app.post('/api/zinipay/verify', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const { invoiceId, invoice_id } = req.body;
      const targetInvoiceId = String(invoiceId || invoice_id || '').trim();
      if (!targetInvoiceId) {
        res.status(400).json({ error: 'Parameter "invoice_id" is required for verification' });
        return;
      }

      const cfg = await resolveZiniPaySettings();

      // 1. Check if this is a completed Sandbox Invoice session
      const localSession = sandboxInvoices.get(targetInvoiceId);
      if (localSession && localSession.status === 'COMPLETED') {
        recordZiniPayLog({
          type: 'verify_invoice',
          mode: 'sandbox',
          status: 'success',
          invoiceId: targetInvoiceId,
          transactionId: localSession.transactionId,
          amount: localSession.amount,
          latencyMs: Date.now() - startTime,
          summary: `Verified Invoice #${targetInvoiceId} (COMPLETED · TrxID: ${localSession.transactionId})`
        });

        res.json({
          verified: true,
          status: 'COMPLETED',
          invoice_id: targetInvoiceId,
          invoiceId: targetInvoiceId,
          amount: localSession.amount,
          transactionId: localSession.transactionId,
          senderNumber: localSession.senderNumber,
          paymentMethod: localSession.paymentMethod,
          metadata: {
            paymentId: localSession.paymentId,
            userId: localSession.userId,
            bonus: localSession.bonus
          }
        });
        return;
      }

      // 2. If API key is configured, query ZiniPay POST /v1/payment/verify
      if (cfg.apiKey) {
        const verifyRes = await callZiniPayWithFailover(
          cfg.baseUrl,
          '/v1/payment/verify',
          cfg.apiKey,
          {
            invoice_id: targetInvoiceId,
            invoiceId: targetInvoiceId
          }
        );

        const d = verifyRes.data || {};
        const rawStatus = String(
          d.status || d.payment_status || d.data?.status || ''
        ).toUpperCase();
        const isPaid =
          rawStatus === 'COMPLETED' ||
          rawStatus === 'SUCCESS' ||
          rawStatus === 'PAID' ||
          rawStatus === 'APPROVED' ||
          (d.status === true && String(d.payment_status || '').toUpperCase() === 'COMPLETED');

        const trxId =
          d.transaction_id ||
          d.transactionId ||
          d.trx_id ||
          d.data?.transaction_id ||
          targetInvoiceId;
        const sender =
          d.sender_number ||
          d.senderNumber ||
          d.cus_phone ||
          d.payment_number ||
          d.data?.sender_number ||
          'ZiniPay Verified';
        const method =
          d.payment_method ||
          d.paymentMethod ||
          d.provider ||
          d.data?.payment_method ||
          'ZiniPay';
        const verifiedAmt = Number(d.amount || d.data?.amount || localSession?.amount || 0);

        recordZiniPayLog({
          type: 'verify_invoice',
          mode: cfg.mode,
          status: isPaid ? 'success' : 'pending',
          invoiceId: targetInvoiceId,
          transactionId: String(trxId),
          amount: verifiedAmt,
          latencyMs: verifyRes.latencyMs,
          summary: `ZiniPay /v1/payment/verify #${targetInvoiceId}: ${isPaid ? 'COMPLETED' : rawStatus || 'PENDING'}`
        });

        res.json({
          verified: isPaid,
          status: isPaid ? 'COMPLETED' : rawStatus || 'PENDING',
          invoice_id: targetInvoiceId,
          invoiceId: targetInvoiceId,
          amount: verifiedAmt,
          transactionId: String(trxId),
          senderNumber: String(sender),
          paymentMethod: String(method),
          metadata: d.metadata || d.data?.metadata || {},
          raw: d
        });
        return;
      }

      res.json({
        verified: false,
        status: localSession?.status || 'PENDING',
        invoice_id: targetInvoiceId,
        invoiceId: targetInvoiceId,
        message: 'Invoice payment is still pending completion'
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'ZiniPay verification failed' });
    }
  });

  // 5.4 ZiniPay 2-Step Transaction Verification API (/api/zinipay/trx-verify -> /v1/trx/verify + /v1/trx/confirm)
  app.post('/api/zinipay/trx-verify', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const { amount, transactionId, smsRef, senderNumber = '', gateway = 'bKash' } = req.body;
      const cleanTrx = String(transactionId || smsRef || '').trim().toUpperCase();
      const numAmount = Number(amount || 0);

      if (!cleanTrx || numAmount <= 0) {
        res.status(400).json({ error: 'Valid amount and transactionId (or smsRef) are required' });
        return;
      }

      if (confirmedTrxIds.has(cleanTrx)) {
        res.status(400).json({
          verified: false,
          error: `Transaction ID (${cleanTrx}) has already been verified and confirmed!`
        });
        return;
      }

      const cfg = await resolveZiniPaySettings();

      // Check if received via ZiniPay SMS Webhook listener first
      const webhookHit = webhookVerifiedTrx.get(cleanTrx);
      if (webhookHit && Number(webhookHit.amount) === numAmount) {
        confirmedTrxIds.add(cleanTrx);
        recordZiniPayLog({
          type: 'trx_confirm',
          mode: cfg.mode,
          status: 'success',
          transactionId: cleanTrx,
          amount: numAmount,
          latencyMs: Date.now() - startTime,
          summary: `TrxID ${cleanTrx} matched & confirmed via ZiniPay Webhook SMS cache (৳${numAmount})`
        });

        res.json({
          verified: true,
          confirmed: true,
          mode: cfg.mode,
          transactionId: cleanTrx,
          senderNumber: webhookHit.senderNumber || senderNumber,
          provider: webhookHit.provider || gateway,
          amount: numAmount,
          message: 'Verified & confirmed via ZiniPay Webhook SMS Automation'
        });
        return;
      }

      // Step 1 & Step 2 against ZiniPay /v1/trx/verify and /v1/trx/confirm if API key is present
      if (cfg.apiKey) {
        const step1 = await callZiniPayWithFailover(
          cfg.baseUrl,
          '/v1/trx/verify',
          cfg.apiKey,
          {
            amount: numAmount,
            transactionId: cleanTrx,
            smsRef: smsRef || cleanTrx
          }
        );

        const s1Data = step1.data || {};
        const isStep1Verified =
          step1.ok &&
          (s1Data.status === true ||
            s1Data.verified === true ||
            String(s1Data.status || '').toUpperCase() === 'VERIFIED' ||
            String(s1Data.status || '').toUpperCase() === 'SUCCESS' ||
            Boolean(s1Data.id || s1Data.data?.id));

        recordZiniPayLog({
          type: 'trx_verify',
          mode: cfg.mode,
          status: isStep1Verified ? 'success' : 'error',
          transactionId: cleanTrx,
          amount: numAmount,
          latencyMs: step1.latencyMs,
          summary: `Step 1 (/v1/trx/verify) TrxID ${cleanTrx}: ${isStep1Verified ? 'MATCHED' : s1Data.message || 'Not found'}`
        });

        if (isStep1Verified) {
          const trxInternalId = s1Data.id || s1Data.data?.id || cleanTrx;
          const step2 = await callZiniPayWithFailover(
            cfg.baseUrl,
            '/v1/trx/confirm',
            cfg.apiKey,
            {
              id: trxInternalId,
              transactionId: cleanTrx,
              amount: numAmount
            }
          );

          confirmedTrxIds.add(cleanTrx);
          recordZiniPayLog({
            type: 'trx_confirm',
            mode: cfg.mode,
            status: 'success',
            transactionId: cleanTrx,
            amount: numAmount,
            latencyMs: step2.latencyMs,
            summary: `Step 2 (/v1/trx/confirm) TrxID ${cleanTrx} finalized & locked (৳${numAmount})`
          });

          res.json({
            verified: true,
            confirmed: true,
            mode: cfg.mode,
            transactionId: cleanTrx,
            senderNumber: s1Data.senderNumber || s1Data.sender_number || senderNumber,
            provider: s1Data.provider || gateway,
            amount: numAmount,
            message: 'Transaction verified & confirmed via ZiniPay 2-Step Trx API'
          });
          return;
        }

        if (cfg.mode === 'live') {
          res.json({
            verified: false,
            confirmed: false,
            mode: 'live',
            error: s1Data.message || s1Data.error || 'Transaction ID not found in ZiniPay SMS ledger yet'
          });
          return;
        }
      }

      // Sandbox Mode 2-Step Trx Verification Simulation (accepts ZINI*, SBX*, TEST* or valid 8+ char TrxID in Sandbox)
      if (cfg.mode === 'sandbox' && cleanTrx.length >= 6 && !cleanTrx.includes('FAIL')) {
        confirmedTrxIds.add(cleanTrx);
        recordZiniPayLog({
          type: 'trx_confirm',
          mode: 'sandbox',
          status: 'success',
          transactionId: cleanTrx,
          amount: numAmount,
          latencyMs: Date.now() - startTime,
          summary: `Sandbox 2-Step Trx Verified & Confirmed: ${cleanTrx} (${gateway} · ৳${numAmount})`
        });

        res.json({
          verified: true,
          confirmed: true,
          mode: 'sandbox',
          transactionId: cleanTrx,
          senderNumber: senderNumber || '01700000000',
          provider: gateway,
          amount: numAmount,
          message: 'Verified & confirmed via ZiniPay Sandbox 2-Step Trx Engine'
        });
        return;
      }

      res.json({
        verified: false,
        confirmed: false,
        mode: cfg.mode,
        error: 'Transaction ID could not be auto-verified by ZiniPay'
      });
    } catch (error: any) {
      res.status(500).json({ verified: false, error: error?.message || 'ZiniPay Trx verification error' });
    }
  });

  // 5.5 ZiniPay Webhook Receiver (/api/zinipay/webhook) for Invoice Callbacks & SMS Automation
  app.post('/api/zinipay/webhook', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const body = req.body || {};
      const invoiceId = String(body.invoice_id || body.invoiceId || '').trim();
      const trxId = String(body.transactionId || body.transaction_id || body.trxId || body.reference || '').trim().toUpperCase();
      const amount = Number(body.amount || 0);
      const sender = String(body.senderNumber || body.sender_number || body.sender || '');
      const provider = String(body.provider || body.payment_method || 'ZiniPay');
      const status = String(body.status || 'COMPLETED').toUpperCase();

      if (trxId && amount > 0) {
        webhookVerifiedTrx.set(trxId, {
          amount,
          senderNumber: sender,
          provider,
          timestamp: Date.now()
        });
      }

      if (invoiceId && sandboxInvoices.has(invoiceId)) {
        const sess = sandboxInvoices.get(invoiceId)!;
        if (status === 'COMPLETED' || status === 'SUCCESS' || status === 'PAID') {
          sess.status = 'COMPLETED';
          if (trxId) sess.transactionId = trxId;
          if (sender) sess.senderNumber = sender;
          sess.completedAt = Date.now();
          sandboxInvoices.set(invoiceId, sess);
        }
      }

      recordZiniPayLog({
        type: 'webhook',
        mode: 'live',
        status: 'success',
        invoiceId: invoiceId || undefined,
        transactionId: trxId || undefined,
        amount: amount || undefined,
        latencyMs: Date.now() - startTime,
        summary: `Webhook received: ${provider} · ${trxId || invoiceId || 'Event'} · ৳${amount} (${status})`
      });

      res.json({ status: 'received', verified: true });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Webhook processing error' });
    }
  });

  // 5.6 Admin ZiniPay Connection & Multi-Node Diagnostic (/api/zinipay/ping)
  app.post('/api/zinipay/ping', async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const cfg = await resolveZiniPaySettings(req.body);
      const nodes = [
        'https://api.zinipay.com',
        'https://api2.zinipay.com',
        'https://api3.zinipay.com',
        'https://api4.zinipay.com'
      ];

      const nodeResults = await Promise.all(
        nodes.map(async (nodeUrl) => {
          const t0 = Date.now();
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000);
            const r = await fetch(`${nodeUrl}/v1/payment/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'zini-api-key': cfg.apiKey || 'sandbox_ping_check',
                'zinipay-api-key': cfg.apiKey || 'sandbox_ping_check'
              },
              body: JSON.stringify({ invoice_id: 'PING_DIAGNOSTIC' }),
              signal: controller.signal
            });
            clearTimeout(timer);
            return {
              node: nodeUrl,
              reachable: true,
              httpCode: r.status,
              latencyMs: Date.now() - t0
            };
          } catch {
            return {
              node: nodeUrl,
              reachable: false,
              httpCode: 0,
              latencyMs: Date.now() - t0
            };
          }
        })
      );

      const reachableCount = nodeResults.filter(n => n.reachable).length;
      const primaryLatency = nodeResults[0]?.latencyMs || Date.now() - startTime;

      recordZiniPayLog({
        type: 'ping',
        mode: cfg.mode,
        status: reachableCount > 0 ? 'success' : 'error',
        latencyMs: primaryLatency,
        summary: `Diagnostic Ping: ${reachableCount}/${nodes.length} ZiniPay API nodes reachable (${cfg.mode.toUpperCase()} mode)`
      });

      res.json({
        status: 'success',
        mode: cfg.mode,
        hasApiKey: Boolean(cfg.apiKey),
        baseUrl: cfg.baseUrl,
        reachableNodes: reachableCount,
        totalNodes: nodes.length,
        primaryLatencyMs: primaryLatency,
        nodes: nodeResults
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'ZiniPay diagnostic ping failed' });
    }
  });

  // 5.7 Fetch ZiniPay Gateway Logs (/api/zinipay/logs)
  app.get('/api/zinipay/logs', (_req: Request, res: Response) => {
    res.json({
      status: 'success',
      logs: zinipayLogs,
      confirmedCount: confirmedTrxIds.size,
      activeInvoicesCount: sandboxInvoices.size
    });
  });

  // ============================================================================
  // 6. VITE MIDDLEWARE (DEV) OR STATIC ASSETS (PRODUCTION)
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AmarTrend Server] Full-Stack Express + Firestore Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
