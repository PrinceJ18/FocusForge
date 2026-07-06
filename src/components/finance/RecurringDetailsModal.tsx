import React, { useState } from 'react';
import { 
  X, Calendar, Clock, DollarSign, Bell, Repeat, CheckCircle2, 
  Trash2, Edit2, Play, Pause, AlertCircle, RefreshCw 
} from 'lucide-react';
import { type RecurringExpense } from '../../store/useStore';
import { formatCurrency } from '../../lib/formatCurrency';
import { format, parseISO } from 'date-fns';
import { payRecurringExpense, skipRecurringExpense } from '../../lib/recurringUtils';

interface RecurringDetailsModalProps {
  bill: RecurringExpense;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function RecurringDetailsModal({
  bill,
  onClose,
  onEdit,
  onDelete,
}: RecurringDetailsModalProps) {
  const [confirmPay, setConfirmPay] = useState(false);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [processing, setProcessing] = useState(false);

  const formatDisplayDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Never';
    try {
      return format(parseISO(dateStr), 'MMMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getFrequencyLabel = () => {
    switch (bill.frequency) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'bi-weekly': return 'Bi-weekly';
      case 'monthly': return 'Monthly';
      case 'quarterly': return 'Quarterly';
      case 'half-yearly': return 'Half-yearly';
      case 'yearly': return 'Yearly';
      case 'custom': return `Every ${bill.custom_interval} Days`;
      default: return bill.frequency;
    }
  };

  const handlePay = async () => {
    setProcessing(true);
    try {
      await payRecurringExpense(bill.id);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
      onClose();
    }
  };

  const handleSkip = async () => {
    setProcessing(true);
    try {
      await skipRecurringExpense(bill.id);
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
      onClose();
    }
  };

  return (
    <div className="modal-overlay z-[180]" onClick={onClose}>
      <div 
        className="modal-content p-6 max-w-md w-full relative overflow-hidden flex flex-col gap-5 text-left text-xs text-slate-300"
        onClick={(e) => e.stopPropagation()}
        style={{
          border: `1px solid ${bill.color}30`,
          boxShadow: `0 0 30px ${bill.color}15`,
        }}
      >
        {/* Header decoration */}
        <div 
          className="absolute -top-24 -right-24 w-48 h-48 rounded-full opacity-10"
          style={{ background: `radial-gradient(circle, ${bill.color}, transparent 70%)` }}
        />

        {/* Modal Header */}
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ background: `${bill.color}20`, border: `1px solid ${bill.color}40`, color: bill.color }}
            >
              {bill.icon || '🏷'}
            </div>
            <div>
              <h3 className="font-bold text-base text-white truncate max-w-[200px]" style={{ fontFamily: 'Space Grotesk' }}>
                {bill.name}
              </h3>
              <span 
                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 inline-block"
                style={{
                  background: bill.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                  color: bill.status === 'active' ? '#10b981' : '#f59e0b',
                }}
              >
                {bill.status}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white p-1 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Amount */}
        <div className="bg-white/2 border border-white/5 rounded-2xl p-4 text-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-medium">Billing Amount</span>
          <span className="text-3xl font-black text-white mt-1 block" style={{ fontFamily: 'Space Grotesk' }}>
            {formatCurrency(bill.amount)}
          </span>
          <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mt-1 block">
            {getFrequencyLabel()} Billing Cycle
          </span>
        </div>

        {/* Meta Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-slate-500 block font-medium">Next Due Date</span>
            <div className="flex items-center gap-1.5 text-white font-semibold">
              <Calendar size={13} className="text-purple-400" />
              <span>{formatDisplayDate(bill.payment_date)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 block font-medium">Last Payment Date</span>
            <div className="flex items-center gap-1.5 text-white font-semibold">
              <Clock size={13} className="text-cyan-400" />
              <span>{formatDisplayDate(bill.last_payment_date)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 block font-medium">Start Date</span>
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span>{formatDisplayDate(bill.start_date)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-500 block font-medium">End Date</span>
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span>{bill.end_date ? formatDisplayDate(bill.end_date) : 'No End Date'}</span>
            </div>
          </div>
        </div>

        {/* Settings list */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          {bill.description && (
            <div className="bg-slate-900/50 p-2.5 rounded-xl border border-white/3 mb-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-slate-300 leading-relaxed text-xs">{bill.description}</p>
            </div>
          )}

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Reminder Period</span>
            <span className="text-white font-semibold capitalize">{bill.reminder.replace('-', ' ')}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Auto Confirm Payments</span>
            <span className={bill.auto_confirm ? 'text-green-400 font-semibold' : 'text-slate-400'}>
              {bill.auto_confirm ? 'Enabled (Automatic Confirm)' : 'Disabled'}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 font-medium">Auto Add to Expenses</span>
            <span className={bill.auto_add ? 'text-cyan-400 font-semibold' : 'text-slate-400'}>
              {bill.auto_add ? 'Enabled (Auto Logs Expense)' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Dynamic Inner Confirmations */}
        {confirmPay && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex flex-col gap-2.5">
            <div className="flex gap-2">
              <AlertCircle size={14} className="text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-xs">Confirm Payment?</p>
                <p className="text-[10px] text-green-300/80 mt-0.5 leading-relaxed">
                  This will log an expense of {formatCurrency(bill.amount)} and advance the next payment date to the next cycle.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setConfirmPay(false)} 
                className="px-2.5 py-1 rounded bg-slate-900 border border-white/5 text-slate-400 text-[10px] font-bold hover:text-white"
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handlePay} 
                className="px-2.5 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold"
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Confirm Paid'}
              </button>
            </div>
          </div>
        )}

        {confirmSkip && (
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl flex flex-col gap-2.5">
            <div className="flex gap-2">
              <AlertCircle size={14} className="text-purple-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-xs">Skip Current Cycle?</p>
                <p className="text-[10px] text-purple-300/80 mt-0.5 leading-relaxed">
                  This will advance the payment date to the next cycle without logging any expense transaction.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setConfirmSkip(false)} 
                className="px-2.5 py-1 rounded bg-slate-900 border border-white/5 text-slate-400 text-[10px] font-bold hover:text-white"
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSkip} 
                className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold"
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Confirm Skip'}
              </button>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex flex-col gap-2.5">
            <div className="flex gap-2">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-xs">Delete Recurring Bill?</p>
                <p className="text-[10px] text-red-300/80 mt-0.5 leading-relaxed">
                  This deletes the recurring bill definition. Historical expense records already created will NOT be deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setConfirmDelete(false)} 
                className="px-2.5 py-1 rounded bg-slate-900 border border-white/5 text-slate-400 text-[10px] font-bold hover:text-white"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={onDelete} 
                className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold"
              >
                Delete Bill
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!confirmPay && !confirmSkip && !confirmDelete && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-white/5">
            {bill.status === 'active' && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmPay(true)}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs"
                >
                  <CheckCircle2 size={13} /> Mark Paid
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmSkip(true)}
                  className="py-2 px-3 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-white/5 font-bold rounded-xl flex items-center justify-center gap-1 transition-colors text-xs"
                  title="Skip this billing cycle"
                >
                  Skip
                </button>
              </>
            )}
            
            <button
              type="button"
              onClick={onEdit}
              className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 font-bold rounded-xl flex items-center justify-center gap-1 transition-colors text-xs"
            >
              <Edit2 size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="py-2 px-3 bg-red-950/20 hover:bg-red-500/10 text-red-400 border border-red-900/30 hover:border-red-500/20 font-bold rounded-xl flex items-center justify-center gap-1 transition-colors text-xs"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
