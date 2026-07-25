import React, { useState } from 'react';
import { 
  Calendar, Clock, CheckCircle2, 
  Trash2, Edit2, AlertCircle 
} from 'lucide-react';
import { type RecurringExpense } from '../../store/useStore';
import { formatCurrency } from '../../lib/formatCurrency';
import { format, parseISO } from 'date-fns';
import { payRecurringExpense, skipRecurringExpense } from '../../lib/recurringUtils';
import Modal from '../ui/Modal';

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
    <Modal
      isOpen={true}
      onClose={onClose}
      title={bill.name}
      subtitle={`${bill.status.toUpperCase()} • ${getFrequencyLabel()}`}
      icon={<span className="text-lg">{bill.icon || '🏷'}</span>}
      maxWidth="md"
      footer={
        !confirmPay && !confirmSkip && !confirmDelete ? (
          <div className="flex gap-2 w-full">
            {bill.status === 'active' && (
              <>
                <button
                  type="button"
                  onClick={() => setConfirmPay(true)}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs"
                >
                  <CheckCircle2 size={14} /> Mark Paid
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmSkip(true)}
                  className="py-2.5 px-3 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 font-bold rounded-xl flex items-center justify-center gap-1 transition-colors text-xs"
                  title="Skip this billing cycle"
                >
                  Skip
                </button>
              </>
            )}
            
            <button
              type="button"
              onClick={onEdit}
              className="py-2.5 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs"
            >
              <Edit2 size={14} /> Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="py-2.5 px-3.5 bg-red-950/30 hover:bg-red-500/20 text-red-400 border border-red-800/40 font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors text-xs"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4 text-left text-xs text-slate-300">
        {/* Amount */}
        <div className="bg-slate-800/50 border border-slate-700/60 rounded-2xl p-4 text-center">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">Billing Amount</span>
          <span className="text-3xl font-black text-slate-100 mt-1 block" style={{ fontFamily: 'Space Grotesk' }}>
            {formatCurrency(bill.amount)}
          </span>
          <span className="text-[10px] text-purple-400 font-semibold uppercase tracking-wider mt-1 block">
            {getFrequencyLabel()} Billing Cycle
          </span>
        </div>

        {/* Meta Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Next Due Date</span>
            <div className="flex items-center gap-1.5 text-slate-100 font-semibold">
              <Calendar size={13} className="text-purple-400" />
              <span>{formatDisplayDate(bill.payment_date)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Last Payment Date</span>
            <div className="flex items-center gap-1.5 text-slate-100 font-semibold">
              <Clock size={13} className="text-cyan-400" />
              <span>{formatDisplayDate(bill.last_payment_date)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">Start Date</span>
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span>{formatDisplayDate(bill.start_date)}</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 block font-medium">End Date</span>
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span>{bill.end_date ? formatDisplayDate(bill.end_date) : 'No End Date'}</span>
            </div>
          </div>
        </div>

        {/* Settings list */}
        <div className="space-y-2 pt-2 border-t border-slate-800">
          {bill.description && (
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 mb-1">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-slate-200 leading-relaxed text-xs">{bill.description}</p>
            </div>
          )}

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Reminder Period</span>
            <span className="text-slate-100 font-semibold capitalize">{bill.reminder.replace('-', ' ')}</span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Auto Confirm Payments</span>
            <span className={bill.auto_confirm ? 'text-green-400 font-semibold' : 'text-slate-400'}>
              {bill.auto_confirm ? 'Enabled (Automatic Confirm)' : 'Disabled'}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400 font-medium">Auto Add to Expenses</span>
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
                <p className="font-bold text-slate-100 text-xs">Confirm Payment?</p>
                <p className="text-[10px] text-green-300/90 mt-0.5 leading-relaxed">
                  This will log an expense of {formatCurrency(bill.amount)} and advance the next payment date to the next cycle.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setConfirmPay(false)} 
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:text-white"
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handlePay} 
                className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold"
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
                <p className="font-bold text-slate-100 text-xs">Skip Current Cycle?</p>
                <p className="text-[10px] text-purple-300/90 mt-0.5 leading-relaxed">
                  This will advance the payment date to the next cycle without logging any expense transaction.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setConfirmSkip(false)} 
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:text-white"
                disabled={processing}
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSkip} 
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
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
                <p className="font-bold text-slate-100 text-xs">Delete Recurring Bill?</p>
                <p className="text-[10px] text-red-300/90 mt-0.5 leading-relaxed">
                  This deletes the recurring bill definition. Historical expense records already created will NOT be deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                type="button"
                onClick={() => setConfirmDelete(false)} 
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold hover:text-white"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={onDelete} 
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Delete Bill
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

