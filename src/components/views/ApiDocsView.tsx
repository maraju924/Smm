import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Copy, 
  Terminal, 
  Key, 
  Play, 
  RefreshCw,
  Server,
  Eye,
  EyeOff,
  Download,
  CheckCircle2,
  Activity,
  Layers,
  Search,
  BookOpen,
  Cpu,
  Zap,
  ShieldCheck,
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SMMService, SMMOrder, SMMRefill } from '../../types';
import { 
  regenerateUserApiKeyOnServer,
  createOrder,
  requestRefill,
  updateOrderStatus,
  fetchServerHealthStatus,
  safeParseJsonResponse
} from '../../services/db';

interface ApiDocsViewProps {
  services: SMMService[];
  orders?: SMMOrder[];
  refills?: SMMRefill[];
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAuth: () => void;
}

type ApiStudioTab = 'sandbox' | 'endpoints' | 'sdks' | 'catalog';
type ApiActionType = 'services' | 'balance' | 'add' | 'status' | 'orders' | 'refill' | 'refill_status' | 'cancel';
type SdkLanguage = 'curl' | 'php' | 'python' | 'node' | 'go' | 'csharp';

export const ApiDocsView: React.FC<ApiDocsViewProps> = ({
  services,
  orders = [],
  refills = [],
  onShowToast,
  onOpenAuth
}) => {
  const { profile, language, formatPrice } = useAuth();
  const [activeTab, setActiveTab] = useState<ApiStudioTab>('sandbox');
  const [showKey, setShowKey] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [serverPingMs, setServerPingMs] = useState<number>(18);

  // SDK Generator State
  const [selectedLanguage, setSelectedLanguage] = useState<SdkLanguage>('php');
  const [sdkAction, setSdkAction] = useState<ApiActionType>('add');

  // Live Express Server API v2 Sandbox State
  const [testAction, setTestAction] = useState<ApiActionType>('services');
  const [testServiceId, setTestServiceId] = useState<string>('');
  const [testLink, setTestLink] = useState<string>('https://facebook.com/amartrend.official');
  const [testQuantity, setTestQuantity] = useState<number>(1000);
  const [testRuns, setTestRuns] = useState<string>('');
  const [testInterval, setTestInterval] = useState<string>('');
  const [testOrderId, setTestOrderId] = useState<string>('');
  const [testMultiOrderIds, setTestMultiOrderIds] = useState<string>('');
  const [testRefillId, setTestRefillId] = useState<string>('');
  const [testResponse, setTestResponse] = useState<string | null>(null);
  const [testHttpCode, setTestHttpCode] = useState<number | null>(null);
  const [testLatencyMs, setTestLatencyMs] = useState<number | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Catalog Quick Lookup State
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState('All');

  useEffect(() => {
    if (services.length > 0 && !testServiceId) {
      setTestServiceId(services[0].id);
    }
  }, [services, testServiceId]);

  useEffect(() => {
    if (orders.length > 0 && !testOrderId) {
      setTestOrderId(orders[0].id);
      setTestMultiOrderIds(orders.slice(0, 3).map(o => o.id).join(','));
    }
  }, [orders, testOrderId]);

  useEffect(() => {
    if (refills.length > 0 && !testRefillId) {
      setTestRefillId(refills[0].id);
    }
  }, [refills, testRefillId]);

  useEffect(() => {
    const start = Date.now();
    fetchServerHealthStatus().then((res) => {
      if (res) {
        setServerPingMs(Math.max(8, Date.now() - start));
      }
    });
  }, []);

  const apiKey = profile?.apiKey || 'amt_live_sign_in_to_unlock_your_secret_key';
  const maskedApiKey = profile?.apiKey
    ? `${profile.apiKey.slice(0, 12)}••••••••••••••••${profile.apiKey.slice(-4)}`
    : apiKey;
  const apiUrl = `${window.location.origin}/api/v2`;
  const sampleServiceId = testServiceId || services[0]?.id || 'srv-101';
  const sampleOrderId = testOrderId || orders[0]?.id || 'ORD-849201';

  const selectedSandboxService = services.find(s => s.id === testServiceId) || services[0];
  const calculatedSandboxCharge = selectedSandboxService
    ? Number((((testQuantity * (Number(testRuns) > 1 ? Number(testRuns) : 1)) / 1000) * selectedSandboxService.rate).toFixed(2))
    : 0;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    onShowToast(`${label} copied to clipboard!`, 'success');
  };

  const handleRegenerateKey = async () => {
    if (!profile) {
      onOpenAuth();
      return;
    }
    setRegenerating(true);
    try {
      await regenerateUserApiKeyOnServer(profile.uid, profile.apiKey);
      onShowToast(
        language === 'bn'
          ? 'নতুন API Key সার্ভারে জেনারেট ও ইনডেক্স হয়েছে!'
          : 'New Secret API Key generated & indexed on server!',
        'success'
      );
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to rotate API key', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadPostmanCollection = () => {
    const collectionJson = {
      info: {
        name: 'AmarTrend SMM Panel API v2 Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: '1. Get Active Services List',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            url: { raw: apiUrl },
            body: { mode: 'raw', raw: JSON.stringify({ key: apiKey, action: 'services' }, null, 2) }
          }
        },
        {
          name: '2. Check User Balance',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            url: { raw: apiUrl },
            body: { mode: 'raw', raw: JSON.stringify({ key: apiKey, action: 'balance' }, null, 2) }
          }
        },
        {
          name: '3. Add New Order',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            url: { raw: apiUrl },
            body: {
              mode: 'raw',
              raw: JSON.stringify(
                { key: apiKey, action: 'add', service: sampleServiceId, link: 'https://facebook.com/page', quantity: 1000 },
                null,
                2
              )
            }
          }
        },
        {
          name: '4. Single Order Status',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            url: { raw: apiUrl },
            body: { mode: 'raw', raw: JSON.stringify({ key: apiKey, action: 'status', order: sampleOrderId }, null, 2) }
          }
        },
        {
          name: '5. Multi-Order Batch Status',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            url: { raw: apiUrl },
            body: {
              mode: 'raw',
              raw: JSON.stringify({ key: apiKey, action: 'orders', orders: `${sampleOrderId},ORD-100002` }, null, 2)
            }
          }
        },
        {
          name: '6. Request Order Refill',
          request: {
            method: 'POST',
            header: [{ key: 'Content-Type', value: 'application/json' }],
            url: { raw: apiUrl },
            body: { mode: 'raw', raw: JSON.stringify({ key: apiKey, action: 'refill', order: sampleOrderId }, null, 2) }
          }
        }
      ]
    };

    const blob = new Blob([JSON.stringify(collectionJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'AmarTrend_SMM_API_v2.postman_collection.json';
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Postman API v2 Collection downloaded!', 'success');
  };

  const buildSandboxPayload = (): Record<string, any> => {
    const payload: Record<string, any> = {
      key: profile?.apiKey || '',
      action: testAction
    };
    if (profile?.uid) {
      payload.uid = profile.uid;
    }

    if (testAction === 'add') {
      payload.service = testServiceId;
      payload.link = testLink.trim();
      payload.quantity = testQuantity;
      if (Number(testRuns) > 1) payload.runs = Number(testRuns);
      if (Number(testInterval) > 0) payload.interval = Number(testInterval);
    } else if (testAction === 'status') {
      payload.order = testOrderId.trim() || sampleOrderId;
    } else if (testAction === 'orders') {
      payload.orders = testMultiOrderIds.trim() || sampleOrderId;
    } else if (testAction === 'refill') {
      payload.order = testOrderId.trim() || sampleOrderId;
    } else if (testAction === 'refill_status') {
      payload.refill = testRefillId.trim() || 'REF-10001';
    } else if (testAction === 'cancel') {
      payload.order = testOrderId.trim() || sampleOrderId;
    }

    return payload;
  };

  const handleRunLiveServerTest = async () => {
    setIsTesting(true);
    setTestResponse(null);
    const startTime = Date.now();

    try {
      const payload = buildSandboxPayload();

      // If action === 'add' and user is logged in, validate on /api/v2 AND create real order in Firestore
      if (testAction === 'add' && profile && selectedSandboxService) {
        const res = await fetch('/api/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await safeParseJsonResponse(res, 'API v2 add order request failed');
        const elapsed = Date.now() - startTime;
        setTestHttpCode(res.status);
        setTestLatencyMs(elapsed);

        if (res.ok && data.status === 'success') {
          const realOrderId = await createOrder(
            {
              userId: profile.uid,
              userEmail: profile.email,
              serviceId: selectedSandboxService.id,
              serviceName: selectedSandboxService.name,
              category: selectedSandboxService.category,
              link: testLink.trim(),
              quantity: Number(data.quantity || testQuantity),
              charge: Number(data.charge || calculatedSandboxCharge),
              status: 'pending',
              ...(Number(testRuns) > 1 ? { dripfeed: true, runs: Number(testRuns), interval: Number(testInterval) || 30 } : {})
            },
            profile,
            selectedSandboxService
          );

          const finalOutput = {
            status: 'success',
            order: realOrderId,
            service: selectedSandboxService.id,
            charge: String(calculatedSandboxCharge),
            currency: 'BDT',
            message: 'Real order created on server via API v2!'
          };
          setTestOrderId(realOrderId);
          setTestResponse(JSON.stringify(finalOutput, null, 2));
          onShowToast(`API Order #${realOrderId} placed on server!`, 'success');
        } else {
          setTestResponse(JSON.stringify(data, null, 2));
        }
        return;
      }

      // If action === 'refill' and user is logged in, also persist refill in Firestore
      if (testAction === 'refill' && profile) {
        const targetOrd = orders.find(o => o.id === (testOrderId.trim() || sampleOrderId));
        const res = await fetch('/api/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await safeParseJsonResponse(res, 'API v2 refill request failed');
        setTestHttpCode(res.status);
        setTestLatencyMs(Date.now() - startTime);

        if (res.ok && targetOrd) {
          const refId = await requestRefill(targetOrd.id, profile.uid, profile.email, targetOrd.serviceName);
          setTestRefillId(refId);
          setTestResponse(JSON.stringify({ refill: refId, order: targetOrd.id, status: 'pending' }, null, 2));
          onShowToast(`API Refill #${refId} created!`, 'success');
        } else {
          setTestResponse(JSON.stringify(data, null, 2));
        }
        return;
      }

      // If action === 'cancel' and user owns the pending order, cancel & auto-refund
      if (testAction === 'cancel' && profile) {
        const targetOrd = orders.find(o => o.id === (testOrderId.trim() || sampleOrderId));
        const res = await fetch('/api/v2', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await safeParseJsonResponse(res, 'API v2 cancel request failed');
        setTestHttpCode(res.status);
        setTestLatencyMs(Date.now() - startTime);

        if (res.ok && targetOrd && ['pending', 'processing'].includes(targetOrd.status)) {
          await updateOrderStatus(targetOrd.id, 'canceled', targetOrd);
          setTestResponse(
            JSON.stringify(
              { order: targetOrd.id, cancel: 1, status: 'canceled', refunded_bdt: targetOrd.charge },
              null,
              2
            )
          );
          onShowToast(`Order #${targetOrd.id} canceled & refunded via API!`, 'info');
        } else {
          setTestResponse(JSON.stringify(data, null, 2));
        }
        return;
      }

      // Standard /api/v2 execution for services, balance, status, orders, refill_status
      const res = await fetch('/api/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await safeParseJsonResponse(res, 'API v2 request failed');
      setTestHttpCode(res.status);
      setTestLatencyMs(Date.now() - startTime);
      setTestResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestHttpCode(500);
      setTestLatencyMs(Date.now() - startTime);
      setTestResponse(JSON.stringify({ error: err?.message || 'Server request failed' }, null, 2));
    } finally {
      setIsTesting(false);
    }
  };

  // Dynamic Code Snippet Generator across 6 languages & all actions
  const generateSdkSnippet = (lang: SdkLanguage, action: ApiActionType): string => {
    const params: Record<string, string | number> = {
      key: apiKey,
      action
    };
    if (action === 'add') {
      params.service = sampleServiceId;
      params.link = 'https://facebook.com/yourpage';
      params.quantity = 1000;
    } else if (action === 'status' || action === 'refill' || action === 'cancel') {
      params.order = sampleOrderId;
    } else if (action === 'orders') {
      params.orders = `${sampleOrderId},ORD-992811`;
    } else if (action === 'refill_status') {
      params.refill = testRefillId || 'REF-10294';
    }

    if (lang === 'curl') {
      const lines = Object.entries(params).map(([k, v]) => `  -d "${k}=${v}"`);
      return `curl -X POST "${apiUrl}" \\\n${lines.join(' \\\n')}`;
    }

    if (lang === 'php') {
      const phpArray = Object.entries(params)
        .map(([k, v]) => `    '${k}' => ${typeof v === 'number' ? v : `'${v}'`}`)
        .join(',\n');
      return `<?php
// AmarTrend SMM Panel API v2 Client (WHMCS / SmartPanel Compatible)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "${apiUrl}");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
${phpArray}
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);
print_r($result);`;
    }

    if (lang === 'python') {
      const pyDict = Object.entries(params)
        .map(([k, v]) => `    "${k}": ${typeof v === 'number' ? v : `"${v}"`}`)
        .join(',\n');
      return `import requests

API_URL = "${apiUrl}"
payload = {
${pyDict}
}

response = requests.post(API_URL, json=payload, timeout=15)
print("HTTP Status:", response.status_code)
print(response.json())`;
    }

    if (lang === 'node') {
      return `// Node.js / TypeScript Fetch Client
const response = await fetch("${apiUrl}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(${JSON.stringify(params, null, 4)})
});

const data = await response.json();
console.log("API v2 Response:", data);`;
    }

    if (lang === 'go') {
      return `package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
)

func main() {
	payload := []byte(\`${JSON.stringify(params)}\`)
	resp, err := http.Post("${apiUrl}", "application/json", bytes.NewBuffer(payload))
	if err != nil {
		panic(err)
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	fmt.Println(string(body))
}`;
    }

    return `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;

class Program {
    static async Task Main() {
        using var client = new HttpClient();
        var json = @"${JSON.stringify(params).replace(/"/g, '""')}";
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await client.PostAsync("${apiUrl}", content);
        Console.WriteLine(await response.Content.ReadAsStringAsync());
    }
}`;
  };

  const uniqueCategories = ['All', ...Array.from(new Set(services.map(s => s.category)))];
  const filteredCatalog = services.filter(s => {
    const matchCat = catalogCategory === 'All' || s.category === catalogCategory;
    const matchSearch =
      !catalogSearch ||
      s.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      s.category.toLowerCase().includes(catalogSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  const apiEndpointSpecs = [
    {
      action: 'add',
      title: language === 'bn' ? 'নতুন অর্ডার প্লেস (Add Order)' : 'Place New Order (action=add)',
      badge: 'POST / GET',
      desc: 'Creates a live order on the server, validates min/max quantity, deducts wallet balance, and dispatches to upstream provider.',
      params: [
        { name: 'key', req: 'Required', desc: 'Your Secret Reseller API Key' },
        { name: 'action', req: 'Required', desc: 'Set to "add"' },
        { name: 'service', req: 'Required', desc: 'Service ID (e.g. srv-101)' },
        { name: 'link', req: 'Required', desc: 'Target post/profile URL' },
        { name: 'quantity', req: 'Required', desc: 'Order quantity between min and max' },
        { name: 'runs', req: 'Optional', desc: 'Drip-feed runs count' },
        { name: 'interval', req: 'Optional', desc: 'Drip-feed interval in minutes' }
      ],
      sampleResponse: `{\n  "status": "success",\n  "order": "ORD-749201",\n  "charge": "150.00",\n  "currency": "BDT"\n}`
    },
    {
      action: 'status',
      title: language === 'bn' ? 'সিঙ্গেল অর্ডার স্ট্যাটাস (Single Status)' : 'Single Order Status (action=status)',
      badge: 'POST / GET',
      desc: 'Returns live status, start_count, remains, and charge for a single order ID.',
      params: [
        { name: 'key', req: 'Required', desc: 'Your Secret API Key' },
        { name: 'action', req: 'Required', desc: 'Set to "status"' },
        { name: 'order', req: 'Required', desc: 'Order ID (e.g. ORD-749201)' }
      ],
      sampleResponse: `{\n  "order": "ORD-749201",\n  "status": "in_progress",\n  "charge": "150.00",\n  "start_count": "1420",\n  "remains": "250",\n  "currency": "BDT"\n}`
    },
    {
      action: 'orders',
      title: language === 'bn' ? 'মাল্টি-অর্ডার ব্যাচ স্ট্যাটাস (Multi-Order Status)' : 'Multi-Order Batch Status (action=orders)',
      badge: 'Up to 100 IDs',
      desc: 'Checks live status of up to 100 comma-separated order IDs in a single HTTP request.',
      params: [
        { name: 'key', req: 'Required', desc: 'Your Secret API Key' },
        { name: 'action', req: 'Required', desc: 'Set to "orders" or "status"' },
        { name: 'orders', req: 'Required', desc: 'Comma-separated IDs (ORD-101,ORD-102)' }
      ],
      sampleResponse: `{\n  "ORD-101": { "charge": "120", "start_count": "500", "status": "completed", "remains": "0", "currency": "BDT" },\n  "ORD-102": { "charge": "85", "start_count": "10", "status": "in_progress", "remains": "400", "currency": "BDT" }\n}`
    },
    {
      action: 'services',
      title: language === 'bn' ? 'সকল সার্ভিস ক্যাটালগ (Services List)' : 'Active Services Catalog (action=services)',
      badge: 'Live Feed',
      desc: 'Fetches all active services with real-time rates, min/max limits, refill, and drip-feed flags.',
      params: [
        { name: 'key', req: 'Required', desc: 'Your Secret API Key' },
        { name: 'action', req: 'Required', desc: 'Set to "services"' }
      ],
      sampleResponse: `[\n  {\n    "service": "${sampleServiceId}",\n    "name": "Facebook Page Followers [Non-Drop]",\n    "type": "Default",\n    "category": "Facebook",\n    "rate": "140",\n    "min": "100",\n    "max": "50000",\n    "dripfeed": true,\n    "refill": true\n  }\n]`
    },
    {
      action: 'balance',
      title: language === 'bn' ? 'একাউন্ট ব্যালেন্স চেক (User Balance)' : 'Check Account Balance (action=balance)',
      badge: 'Real-Time',
      desc: 'Verifies your API key against the cloud index and returns live wallet balance & total spent.',
      params: [
        { name: 'key', req: 'Required', desc: 'Your Secret API Key' },
        { name: 'action', req: 'Required', desc: 'Set to "balance"' }
      ],
      sampleResponse: `{\n  "status": "success",\n  "balance": "2450.00",\n  "total_spent": "8920.00",\n  "currency": "BDT"\n}`
    },
    {
      action: 'refill',
      title: language === 'bn' ? 'অটো রিফিল রিকোয়েস্ট (Create Refill)' : 'Create Refill Request (action=refill)',
      badge: 'Refill Engine',
      desc: 'Creates a refill ticket for a refill-eligible order and returns the Refill ID.',
      params: [
        { name: 'key', req: 'Required', desc: 'Your Secret API Key' },
        { name: 'action', req: 'Required', desc: 'Set to "refill"' },
        { name: 'order', req: 'Required', desc: 'Order ID (e.g. ORD-749201)' }
      ],
      sampleResponse: `{\n  "refill": "REF-49201",\n  "order": "ORD-749201",\n  "status": "pending"\n}`
    },
    {
      action: 'cancel',
      title: language === 'bn' ? 'অর্ডার ক্যানসেল ও রিফান্ড (Cancel Order)' : 'Cancel Order & Auto-Refund (action=cancel)',
      badge: 'Instant Refund',
      desc: 'Cancels a pending order via API and automatically credits the charge back to your wallet.',
      params: [
        { name: 'key', req: 'Required', desc: 'Your Secret API Key' },
        { name: 'action', req: 'Required', desc: 'Set to "cancel"' },
        { name: 'order', req: 'Required', desc: 'Order ID to cancel' }
      ],
      sampleResponse: `{\n  "order": "ORD-749201",\n  "cancel": 1,\n  "status": "canceled"\n}`
    }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-10 overflow-x-hidden">
      {/* EXECUTIVE DEVELOPER API v2 HERO BANNER */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-[#0B1325] to-slate-950 border border-sky-500/30 shadow-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-2xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                <Code2 className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>Enterprise SMM REST API v2 Studio</span>
                  <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                    v2.4 LIVE
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  {language === 'bn'
                    ? 'আপনার নিজস্ব চাইল্ড প্যানেল, টেলিগ্রাম বট বা ওয়েবসাইট সরাসরি আমাদের ক্লাউড সার্ভারের সাথে সংযুক্ত করুন'
                    : 'Connect WHMCS, SmartPanel, Child Panels, or Telegram Bots directly to our Cloud Express API Server'}
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownloadPostmanCollection}
            className="py-2 px-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-sky-300 flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'Postman JSON ডাউনলোড' : 'Postman Collection'}</span>
          </button>
        </div>

        {/* 4 Telemetry Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              Server Latency
            </span>
            <p className="text-sm font-black font-mono text-emerald-400 mt-0.5">
              {serverPingMs} ms · ONLINE
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              API Wallet Balance
            </span>
            <p className="text-sm font-black font-mono text-white mt-0.5">
              {profile ? formatPrice(profile.balance) : 'Sign In'}
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <Layers className="w-3 h-3 text-sky-400" />
              API Ready Services
            </span>
            <p className="text-sm font-black font-mono text-sky-400 mt-0.5">
              {services.length} Active IDs
            </p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800/90">
            <span className="text-[10px] text-slate-400 font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-rose-400" />
              Auth Protocol
            </span>
            <p className="text-sm font-black font-mono text-rose-300 mt-0.5">
              Key Index v2
            </p>
          </div>
        </div>

        {/* Secret API Key & Endpoint URL Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Secret Key */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                {language === 'bn' ? 'আপনার সিক্রেট API Key' : 'Secret Reseller API Key'}
              </span>
              {profile ? (
                <button
                  type="button"
                  onClick={handleRegenerateKey}
                  disabled={regenerating}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
                  <span>{language === 'bn' ? 'নতুন কি জেনারেট' : 'Rotate Key'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="text-[11px] font-bold text-sky-400 hover:underline"
                >
                  Sign In
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span className="font-mono text-xs text-emerald-400 font-bold flex-1 select-all truncate">
                {showKey ? apiKey : maskedApiKey}
              </span>
              {profile && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                    title={showKey ? 'Hide API Key' : 'Show API Key'}
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(apiKey, 'Secret API Key')}
                    className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                    title="Copy API Key"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Endpoint URL */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-sky-400" />
                {language === 'bn' ? 'সার্ভার HTTP এন্ডপয়েন্ট URL' : 'Server API v2 Endpoint URL'}
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                POST / GET • JSON & Form
              </span>
            </div>

            <div className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
              <span className="text-amber-400 font-extrabold px-1.5 py-0.5 rounded bg-amber-500/10 text-[10px]">
                POST
              </span>
              <span className="text-white flex-1 select-all truncate">{apiUrl}</span>
              <button
                type="button"
                onClick={() => handleCopy(apiUrl, 'API v2 Endpoint URL')}
                className="p-1.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4-TAB DEVELOPER STUDIO NAVIGATION */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
        {[
          { id: 'sandbox', label: language === 'bn' ? 'লাইভ API কনসোল' : 'Live API Sandbox', icon: Terminal },
          { id: 'endpoints', label: language === 'bn' ? 'সকল এন্ডপয়েন্ট ডকস' : 'API v2 Endpoints (7)', icon: BookOpen },
          { id: 'sdks', label: language === 'bn' ? 'কোড জেনারেটর (6 SDK)' : 'SDK Code Generator', icon: Cpu },
          { id: 'catalog', label: language === 'bn' ? 'সার্ভিস আইডি লিস্ট' : `Service IDs (${services.length})`, icon: Layers },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ApiStudioTab)}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                active
                  ? 'bg-sky-500 text-slate-950 shadow-lg shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* =========================================================
          TAB 1: INTERACTIVE LIVE SERVER API v2 SANDBOX & ORDER TESTER
         ========================================================= */}
      {activeTab === 'sandbox' && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                {language === 'bn'
                  ? 'লাইভ সার্ভার API v2 টেস্টার এবং অর্ডার বিল্ডার'
                  : 'Interactive Live Server API v2 Request Console'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'যেকোনো অ্যাকশন সিলেক্ট করে সরাসরি আমাদের Express সার্ভারে রিয়েল API রিকোয়েস্ট পাঠান'
                  : 'Select an action below to dispatch a real HTTP request to /api/v2 and inspect the live server output'}
              </p>
            </div>
            <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-emerald-400 px-2.5 py-1 rounded-xl">
              POST /api/v2
            </span>
          </div>

          {/* 8 Action Selector Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'services', label: 'action=services', sub: 'Catalog Feed' },
                { id: 'balance', label: 'action=balance', sub: 'Wallet Check' },
                { id: 'add', label: 'action=add', sub: 'Place Live Order' },
                { id: 'status', label: 'action=status', sub: 'Single Status' },
                { id: 'orders', label: 'action=orders', sub: 'Batch 100 Status' },
                { id: 'refill', label: 'action=refill', sub: 'Trigger Refill' },
                { id: 'refill_status', label: 'action=refill_status', sub: 'Refill Check' },
                { id: 'cancel', label: 'action=cancel', sub: 'Cancel & Refund' },
              ] as const
            ).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTestAction(item.id);
                  setTestResponse(null);
                }}
                className={`p-2.5 rounded-2xl text-left transition-all border ${
                  testAction === item.id
                    ? 'bg-sky-500/15 border-sky-400 text-white shadow'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <p className="font-mono text-xs font-extrabold text-sky-400">{item.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.sub}</p>
              </button>
            ))}
          </div>

          {/* Dynamic Parameters Form based on selected testAction */}
          {testAction === 'add' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-amber-400">
                  {language === 'bn' ? 'লাইভ API অর্ডার প্যারামিটার (action=add)' : 'Live API Order Dispatch Parameters'}
                </span>
                <span className="font-mono text-emerald-400 font-bold">
                  Charge: ৳{calculatedSandboxCharge.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">Select Service (service)</label>
                <select
                  value={testServiceId}
                  onChange={(e) => {
                    setTestServiceId(e.target.value);
                    const s = services.find(srv => srv.id === e.target.value);
                    if (s) setTestQuantity(s.min);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white font-semibold focus:outline-none"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.id}>
                      [{s.id}] {s.name} — ৳{s.rate}/1K (Min: {s.min})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Target Link (link)</label>
                  <input
                    type="url"
                    value={testLink}
                    onChange={(e) => setTestLink(e.target.value)}
                    placeholder="https://facebook.com/..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">Quantity (quantity)</label>
                  <input
                    type="number"
                    value={testQuantity}
                    onChange={(e) => setTestQuantity(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Drip-feed Runs (Optional)</label>
                  <input
                    type="number"
                    value={testRuns}
                    onChange={(e) => setTestRuns(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 font-bold block mb-1">Interval Minutes (Optional)</label>
                  <input
                    type="number"
                    value={testInterval}
                    onChange={(e) => setTestInterval(e.target.value)}
                    placeholder="e.g. 30"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {(testAction === 'status' || testAction === 'refill' || testAction === 'cancel') && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <label className="text-[10px] text-slate-400 font-bold block">
                Order ID Parameter (`order`)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={testOrderId}
                  onChange={(e) => setTestOrderId(e.target.value)}
                  placeholder="Enter Order ID (e.g. ORD-123456)"
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none"
                />
                {orders.length > 0 && (
                  <select
                    value={testOrderId}
                    onChange={(e) => setTestOrderId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-sky-300 font-mono"
                  >
                    {orders.slice(0, 15).map(o => (
                      <option key={o.id} value={o.id}>
                        #{o.id} ({o.status}) — ৳{o.charge}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}

          {testAction === 'orders' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <label className="text-[10px] text-slate-400 font-bold block">
                Comma-Separated Order IDs (`orders` — up to 100 IDs)
              </label>
              <input
                type="text"
                value={testMultiOrderIds}
                onChange={(e) => setTestMultiOrderIds(e.target.value)}
                placeholder="ORD-100001,ORD-100002,ORD-100003"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none"
              />
            </div>
          )}

          {testAction === 'refill_status' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <label className="text-[10px] text-slate-400 font-bold block">
                Refill Ticket ID (`refill`)
              </label>
              <input
                type="text"
                value={testRefillId}
                onChange={(e) => setTestRefillId(e.target.value)}
                placeholder="Enter Refill ID (e.g. REF-12345)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none"
              />
            </div>
          )}

          {/* Live Payload Preview */}
          <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800/80 flex items-center justify-between gap-2 font-mono text-[11px]">
            <div className="truncate text-slate-400">
              <span className="text-sky-400 font-bold">Payload: </span>
              {JSON.stringify(buildSandboxPayload())}
            </div>
            <button
              type="button"
              onClick={() => handleCopy(JSON.stringify(buildSandboxPayload(), null, 2), 'JSON Payload')}
              className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white shrink-0"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRunLiveServerTest}
            disabled={isTesting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-sky-500/20 transition-all active:scale-98 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>
              {isTesting
                ? 'Executing Request on Cloud Express Server...'
                : `Execute Live API v2 Request (action=${testAction})`}
            </span>
          </button>

          {testResponse && (
            <div className="space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold">
                    Live Server JSON Response
                  </span>
                  {testHttpCode && (
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                        testHttpCode >= 200 && testHttpCode < 300
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      HTTP {testHttpCode}
                    </span>
                  )}
                  {testLatencyMs !== null && (
                    <span className="text-[10px] font-mono text-sky-400">
                      {testLatencyMs} ms
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(testResponse, 'API Response')}
                  className="text-[11px] font-bold text-slate-300 hover:text-white flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" />
                  Copy JSON
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-80 leading-relaxed">
                {testResponse}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* =========================================================
          TAB 2: COMPLETE 7-ACTION API v2 SPECIFICATION DOCS
         ========================================================= */}
      {activeTab === 'endpoints' && (
        <div className="space-y-3.5">
          {apiEndpointSpecs.map((spec) => (
            <div
              key={spec.action}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3.5 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-xs px-2.5 py-1 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
                    action={spec.action}
                  </span>
                  <h4 className="font-extrabold text-white text-sm">{spec.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                    {spec.badge}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTestAction(spec.action as ApiActionType);
                      setActiveTab('sandbox');
                    }}
                    className="py-1 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold text-[11px] flex items-center gap-1"
                  >
                    <span>Test Live</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <p className="text-slate-400 text-xs">{spec.desc}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Parameters Table */}
                <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
                  <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-[10px] font-extrabold uppercase text-slate-400">
                    Request Parameters
                  </div>
                  <div className="divide-y divide-slate-800/70">
                    {spec.params.map(p => (
                      <div key={p.name} className="p-2.5 flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-white">{p.name}</span>
                          <p className="text-[11px] text-slate-400 mt-0.5">{p.desc}</p>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ${
                            p.req === 'Required'
                              ? 'bg-rose-500/15 text-rose-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {p.req}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sample JSON Output */}
                <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col">
                  <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-[10px] font-extrabold uppercase text-slate-400 flex items-center justify-between">
                    <span>Sample Server Response</span>
                    <span className="text-emerald-400 font-mono">application/json</span>
                  </div>
                  <pre className="p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto flex-1 leading-relaxed">
                    {spec.sampleResponse}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* =========================================================
          TAB 3: MULTI-LANGUAGE SDK & CHILD-PANEL CODE GENERATOR
         ========================================================= */}
      {activeTab === 'sdks' && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                {language === 'bn'
                  ? 'মাল্টি-ল্যাঙ্গুয়েজ SDK ও চাইল্ড-প্যানেল কোড জেনারেটর'
                  : 'Multi-Language SDK & Child-Panel Integration Code Generator'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'আপনার API Key এবং সার্ভিস আইডি সহ রেডিমেড প্রোডাকশন কোড কপি করুন'
                  : 'Pre-configured with your live API Key and endpoint URL for instant integration'}
              </p>
            </div>
          </div>

          {/* Action Selector for Code Generation */}
          <div className="flex flex-wrap gap-1.5">
            {(['add', 'status', 'orders', 'services', 'balance', 'refill', 'cancel'] as const).map(act => (
              <button
                key={act}
                type="button"
                onClick={() => setSdkAction(act)}
                className={`py-1.5 px-3 rounded-xl text-xs font-mono font-bold transition-all ${
                  sdkAction === act
                    ? 'bg-amber-500 text-slate-950 font-black'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                action={act}
              </button>
            ))}
          </div>

          {/* 6 Programming Languages Selector */}
          <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
            {(
              [
                { id: 'php', label: 'PHP (WHMCS / SmartPanel)' },
                { id: 'curl', label: 'cURL (Terminal)' },
                { id: 'python', label: 'Python (Requests)' },
                { id: 'node', label: 'Node.js / TypeScript' },
                { id: 'go', label: 'Go (Golang)' },
                { id: 'csharp', label: 'C# (.NET)' },
              ] as const
            ).map(lang => (
              <button
                key={lang.id}
                type="button"
                onClick={() => setSelectedLanguage(lang.id)}
                className={`py-1.5 px-3 rounded-xl text-[11px] font-extrabold transition-all ${
                  selectedLanguage === lang.id
                    ? 'bg-sky-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <pre className="p-4 rounded-2xl bg-slate-950 border border-slate-800 font-mono text-xs text-sky-200 overflow-x-auto leading-relaxed">
              {generateSdkSnippet(selectedLanguage, sdkAction)}
            </pre>
            <button
              type="button"
              onClick={() => handleCopy(generateSdkSnippet(selectedLanguage, sdkAction), `${selectedLanguage.toUpperCase()} Code`)}
              className="absolute top-3 right-3 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Code</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          TAB 4: LIVE API SERVICE ID QUICK-LOOKUP CATALOG
         ========================================================= */}
      {activeTab === 'catalog' && (
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                {language === 'bn'
                  ? 'লাইভ API সার্ভিস আইডি এবং রেট ক্যাটালগ'
                  : 'Live API v2 Service ID Reference Table'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {language === 'bn'
                  ? 'যেকোনো সার্ভিস আইডি ১-ট্যাপে কপি করুন অথবা সরাসরি স্যান্ডবক্সে টেস্ট করুন'
                  : 'Tap any Service ID to copy for your bot/child-panel or test directly in the API Sandbox'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search Service ID, Name or Category..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>
            <select
              value={catalogCategory}
              onChange={(e) => setCatalogCategory(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none"
            >
              {uniqueCategories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {filteredCatalog.length === 0 ? (
              <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-2xl text-xs text-slate-400">
                No matching API services found.
              </div>
            ) : (
              filteredCatalog.map(s => (
                <div
                  key={s.id}
                  className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/90 flex flex-wrap items-center justify-between gap-2.5 text-xs"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => handleCopy(s.id, `Service ID ${s.id}`)}
                        className="font-mono font-black text-sky-400 bg-sky-500/10 border border-sky-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1 hover:bg-sky-500/20"
                        title="Tap to Copy Service ID"
                      >
                        <span>{s.id}</span>
                        <Copy className="w-3 h-3" />
                      </button>
                      <span className="text-amber-400 font-bold">{s.category}</span>
                      <span className="font-mono font-extrabold text-emerald-400">
                        {formatPrice(s.rate)} / 1K
                      </span>
                      {s.refill && (
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Refill: True
                        </span>
                      )}
                      {s.dripfeed && (
                        <span className="text-[10px] font-bold text-purple-300 bg-purple-500/10 px-1.5 py-0.5 rounded">
                          Drip-Feed
                        </span>
                      )}
                    </div>
                    <p className="text-slate-200 font-semibold truncate">{s.name}</p>
                    <p className="text-[10px] font-mono text-slate-500">
                      Min: {s.min.toLocaleString()} · Max: {s.max.toLocaleString()} · Type: {s.type}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setTestServiceId(s.id);
                      setTestQuantity(s.min);
                      setTestAction('add');
                      setActiveTab('sandbox');
                    }}
                    className="py-2 px-3 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-bold text-[11px] flex items-center gap-1 shrink-0 active:scale-95"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Test in API</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
