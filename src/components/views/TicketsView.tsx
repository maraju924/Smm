import React, { useState } from 'react';
import { 
  MessageSquare, 
  Plus, 
  Send, 
  User, 
  ShieldCheck, 
  Clock, 
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SMMTicket, TicketMessage } from '../../types';
import { createTicket, addTicketMessage } from '../../services/db';

interface TicketsViewProps {
  tickets: SMMTicket[];
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenAuth: () => void;
}

export const TicketsView: React.FC<TicketsViewProps> = ({
  tickets,
  onShowToast,
  onOpenAuth
}) => {
  const { profile, language, isAdmin } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<SMMTicket | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // New ticket form
  const [subject, setSubject] = useState('');
  const [orderId, setOrderId] = useState('');
  const [department, setDepartment] = useState('Order Issue');
  const [initialMessage, setInitialMessage] = useState('');
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) {
      onOpenAuth();
      return;
    }

    if (!subject.trim() || !initialMessage.trim()) return;

    setSubmitting(true);
    try {
      await createTicket(
        {
          userId: profile.uid,
          userEmail: profile.email,
          subject: subject.trim(),
          ...(orderId.trim() ? { orderId: orderId.trim() } : {}),
          department,
          status: 'open',
          priority: 'normal'
        },
        initialMessage.trim(),
        profile.displayName
      );

      onShowToast(language === 'bn' ? 'টিকিট সফলভাবে তৈরি হয়েছে!' : 'Support ticket opened!', 'success');
      setSubject('');
      setOrderId('');
      setInitialMessage('');
      setIsCreating(false);
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to create ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim() || !profile) return;

    setSubmitting(true);
    try {
      const newMsg: TicketMessage = {
        senderId: profile.uid,
        senderName: profile.displayName,
        senderRole: profile.role,
        message: replyText.trim(),
        timestamp: Date.now()
      };

      const newStatus = isAdmin ? 'answered' : 'open';
      await addTicketMessage(selectedTicket.id, selectedTicket.messages, newMsg, newStatus);
      
      // Update local view
      setSelectedTicket({
        ...selectedTicket,
        messages: [...selectedTicket.messages, newMsg],
        status: newStatus
      });

      setReplyText('');
    } catch (err: any) {
      onShowToast(err?.message || 'Failed to send reply', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4 pb-8 overflow-x-hidden">
      {/* If Chat Conversation is Active */}
      {selectedTicket ? (
        <div className="space-y-4 animate-in fade-in">
          {/* Header */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setSelectedTicket(null)}
              className="text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{language === 'bn' ? 'তালিকায় ফিরুন' : 'Back to Tickets'}</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-400">
                #{selectedTicket.id}
              </span>
              <span className={`py-0.5 px-2.5 rounded-full text-[10px] font-extrabold uppercase ${
                selectedTicket.status === 'answered'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : selectedTicket.status === 'closed'
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              }`}>
                {selectedTicket.status}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800">
            <h3 className="text-sm font-extrabold text-white">{selectedTicket.subject}</h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Department: <strong className="text-slate-300">{selectedTicket.department}</strong>
              {selectedTicket.orderId && <> | Ref Order: <strong className="text-sky-400 font-mono">#{selectedTicket.orderId}</strong></>}
            </p>
          </div>

          {/* Messages Timeline */}
          <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 min-h-[300px] max-h-[500px] overflow-y-auto no-scrollbar">
            {selectedTicket.messages.map((m, idx) => {
              const isMine = m.senderId === profile?.uid;
              const isStaff = m.senderRole === 'admin';

              return (
                <div 
                  key={idx}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                    {isStaff ? (
                      <span className="flex items-center gap-1 font-bold text-amber-400">
                        <ShieldCheck className="w-3 h-3" /> AmarTrend Support
                      </span>
                    ) : (
                      <span className="font-semibold text-slate-300">{m.senderName}</span>
                    )}
                    <span>•</span>
                    <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className={`p-3.5 rounded-2xl max-w-sm sm:max-w-md text-xs leading-relaxed whitespace-pre-wrap ${
                    isMine 
                      ? 'bg-gradient-to-r from-rose-600 to-indigo-600 text-white rounded-tr-none' 
                      : isStaff
                      ? 'bg-amber-950/40 border border-amber-500/30 text-amber-100 rounded-tl-none'
                      : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/60'
                  }`}>
                    {m.message}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reply Form */}
          {selectedTicket.status !== 'closed' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                placeholder={language === 'bn' ? 'আপনার মেসেজ লিখুন...' : 'Type your reply message...'}
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-rose-500 rounded-2xl px-4 py-3 text-xs text-white focus:outline-none"
              />
              <button
                onClick={handleSendReply}
                disabled={submitting || !replyText.trim()}
                className="p-3.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : isCreating ? (
        /* Create Ticket Form */
        <form onSubmit={handleCreate} className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-rose-500" />
              {language === 'bn' ? 'নতুন সাপোর্ট টিকিট তৈরি করুন' : 'Open Support Ticket'}
            </h3>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-xs font-bold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              {language === 'bn' ? 'ডিপার্টমেন্ট' : 'Department'}
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none"
            >
              <option value="Order Issue">Order Issue (অর্ডার সংক্রান্ত সমস্যা)</option>
              <option value="Payment / Deposit">Payment & Deposit (পেমেন্ট বা ডিপোজিট)</option>
              <option value="Refill Issue">Refill Issue (রিফিল সমস্যা)</option>
              <option value="API Support">API Support (এপিআই ইন্টিগ্রেশন)</option>
              <option value="Other">Other Query (অন্যান্য বিষয়)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              {language === 'bn' ? 'বিষয় (Subject)' : 'Subject'}
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Order delayed or refill request"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              {language === 'bn' ? 'অর্ডার আইডি (যদি থাকে)' : 'Order ID (Optional)'}
            </label>
            <input
              type="text"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="ORD-123456"
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              {language === 'bn' ? 'বিস্তারিত বর্ণনা (Message)' : 'Message / Details'}
            </label>
            <textarea
              rows={4}
              required
              value={initialMessage}
              onChange={(e) => setInitialMessage(e.target.value)}
              placeholder="Explain your problem clearly..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-bold text-xs shadow-lg active:scale-95 transition-all"
          >
            {submitting ? 'টিকিট তৈরি হচ্ছে...' : 'Submit Ticket'}
          </button>
        </form>
      ) : (
        /* Ticket List */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-rose-500" />
                {language === 'bn' ? 'সাপোর্ট সেন্টার' : 'Support Desk'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'bn' ? '২৪/৭ গ্রাহক সেবা সহায়তা' : '24/7 dedicated customer assistance'}
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="py-2 px-3.5 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs shadow-md shadow-rose-500/20 active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>{language === 'bn' ? 'নতুন টিকিট' : 'New Ticket'}</span>
            </button>
          </div>

          {tickets.length === 0 ? (
            <div className="p-10 text-center bg-slate-900 border border-slate-800 rounded-3xl space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                {language === 'bn' ? 'কোনো টিকিট রেকর্ড নেই। প্রয়োজনে নতুন টিকিট খুলুন।' : 'No tickets opened yet.'}
              </p>
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition-all shadow-md flex items-center justify-between gap-3 active:scale-98"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                      #{t.id}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">{t.department}</span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-200 mt-1 line-clamp-1">{t.subject}</h4>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Last update: {new Date(t.updatedAt).toLocaleDateString()} • {t.messages.length} messages
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <span className={`py-0.5 px-2.5 rounded-full text-[10px] font-extrabold uppercase ${
                    t.status === 'answered'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : t.status === 'closed'
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}>
                    {t.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
