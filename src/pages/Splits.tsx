import React, { useState } from 'react';
import { Plus, Trash2, X, Users, TrendingDown, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';
import { formatCurrency } from '../lib/formatCurrency';
type SplitType = 'owe' | 'owed';

interface Split {
  id: string;
  name: string;
  amount: number;
  type: SplitType;
  date: string;
  settled: boolean;
}

export default function Splits() {
  const { splits, addSplitLocal, removeSplitLocal, setSplits } = useStore();
  const [showAdd, setShowAdd] = useState(false);
  const [billAmount, setBillAmount] = useState('');
  const [peopleCount, setPeopleCount] = useState('');

  const totalOwed = splits.filter((s) => !s.settled && s.type === 'owed').reduce((sum, s) => sum + s.amount, 0);
  const totalOwe = splits.filter((s) => !s.settled && s.type === 'owe').reduce((sum, s) => sum + s.amount, 0);
  const net = totalOwed - totalOwe;

  const unsettled = splits.filter((s) => !s.settled);
  const settled = splits.filter((s) => s.settled);

  const handleSettle = (id: string) => {
    setSplits(splits.map((s) => (s.id === id ? { ...s, settled: true } : s)));
  };

  const splitAmount =
    Number(billAmount) > 0 &&
      Number(peopleCount) > 0
      ? Number(billAmount) / Number(peopleCount)
      : 0;

  return (
    <div className="page-enter space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(16,185,129,0.2)' }}>
            <TrendingUp size={18} style={{ color: '#10b981' }} />
          </div>
          <div className="text-xl font-bold" style={{ color: '#10b981', fontFamily: 'Space Grotesk' }}>{formatCurrency(totalOwed)}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Others owe you</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(239,68,68,0.2)' }}>
            <TrendingDown size={18} style={{ color: '#ef4444' }} />
          </div>
          <div className="text-xl font-bold" style={{ color: '#ef4444', fontFamily: 'Space Grotesk' }}>{formatCurrency(totalOwe)}</div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>You owe others</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: net >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}>
            <Users size={18} style={{ color: net >= 0 ? '#10b981' : '#ef4444' }} />
          </div>
          <div className="text-xl font-bold" style={{ color: net >= 0 ? '#10b981' : '#ef4444', fontFamily: 'Space Grotesk' }}>
            {net >= 0 ? '+' : ''}{formatCurrency(net)}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Net balance</div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3
          className="font-semibold mb-4"
          style={{ color: 'var(--text-primary)' }}
        >
          Quick Split Calculator
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label
              className="block text-sm mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Bill Amount (₹)
            </label>

            <input
              type="number"
              value={billAmount}
              onChange={(e) =>
                setBillAmount(e.target.value)
              }
              placeholder="1200"
              className="input-glass w-full px-4 py-3"
            />
          </div>

          <div>
            <label
              className="block text-sm mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Number of People
            </label>

            <input
              type="number"
              value={peopleCount}
              onChange={(e) =>
                setPeopleCount(e.target.value)
              }
              placeholder="4"
              className="input-glass w-full px-4 py-3"
            />
          </div>
        </div>

        {splitAmount > 0 && (
          <div
            className="mt-5 p-4 rounded-xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(236,72,153,0.08))',
              border:
                '1px solid rgba(168,85,247,0.2)',
            }}
          >
            <p
              className="text-sm mb-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Each Person Pays
            </p>

            <h2
              className="text-3xl font-bold"
              style={{ color: '#a855f7' }}
            >
              ₹{splitAmount.toFixed(2)}
            </h2>
          </div>
        )}
      </div>

      {/* Active splits */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Active ({unsettled.length})
          </h3>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-neon px-3 py-2 text-sm flex items-center gap-1.5"
            style={{ borderRadius: 10 }}
          >
            <Plus size={14} /> Add Entry
          </button>
        </div>

        {unsettled.length > 0 ? (
          <div className="space-y-3">
            {unsettled.map((split) => (
              <SplitItem
                key={split.id}
                split={split}
                onSettle={() => handleSettle(split.id)}
                onDelete={() => removeSplitLocal(split.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No active splits. All settled!</p>
          </div>
        )}
      </div>

      {/* Settled history */}
      {settled.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
            Settled History ({settled.length})
          </h3>
          <div className="space-y-2">
            {settled.slice(0, 10).map((split) => (
              <div
                key={split.id}
                className="flex items-center justify-between py-2 px-3 rounded-10 opacity-50"
                style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{split.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{split.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: split.type === 'owed' ? '#10b981' : '#ef4444' }}
                  >
                    {split.type === 'owed' ? '+' : '-'}{formatCurrency(split.amount)}
                  </span>
                  <button
                    onClick={() => removeSplitLocal(split.id)}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <AddSplitModal
          onClose={() => setShowAdd(false)}
          onAdd={(data) => {
            addSplitLocal({ id: crypto.randomUUID(), ...data, settled: false, date: format(new Date(), 'yyyy-MM-dd') });
            setShowAdd(false);
          }}
        />
      )}
    </div>
  );
}

function SplitItem({ split, onSettle, onDelete }: { split: Split; onSettle: () => void; onDelete: () => void }) {
  return (
    <div
      className="flex items-center gap-3 p-4 rounded-12"
      style={{
        background: split.type === 'owed' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
        border: `1px solid ${split.type === 'owed' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
        borderRadius: 12,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: split.type === 'owed' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}
      >
        {split.type === 'owed' ? '📥' : '📤'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{split.name}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {split.type === 'owed' ? 'They owe you' : 'You owe them'} • {split.date}
        </p>
      </div>
      <span
        className="text-lg font-bold flex-shrink-0"
        style={{ color: split.type === 'owed' ? '#10b981' : '#ef4444' }}
      >
        {formatCurrency(split.amount)}
      </span>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onSettle}
          className="px-2.5 py-1.5 text-xs rounded-lg font-medium transition-all"
          style={{
            background: 'rgba(16,185,129,0.15)',
            color: '#10b981',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 8,
          }}
        >
          Settle
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

function AddSplitModal({ onClose, onAdd }: {
  onClose: () => void;
  onAdd: (data: { name: string; amount: number; type: SplitType }) => void;
}) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<SplitType>('owe');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)', fontFamily: 'Space Grotesk' }}>New Split Entry</h3>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Person / Description</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-glass w-full px-4 py-3 text-sm"
              placeholder="John — Dinner"
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Amount ({formatCurrency(0)})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input-glass w-full px-4 py-3 text-sm"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Type</label>
            <div className="flex gap-3">
              <button
                onClick={() => setType('owe')}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all"
                style={{
                  background: type === 'owe' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)',
                  color: type === 'owe' ? '#ef4444' : 'var(--text-muted)',
                  border: `1px solid {formatCurrency(type === 'owe' ? 'rgba(239,68,68,0.3)' : 'transparent')}`,
                  borderRadius: 10,
                }}
              >
                I owe them
              </button>
              <button
                onClick={() => setType('owed')}
                className="flex-1 py-2.5 text-sm font-medium rounded-xl transition-all"
                style={{
                  background: type === 'owed' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                  color: type === 'owed' ? '#10b981' : 'var(--text-muted)',
                  border: `1px solid {formatCurrency(type === 'owed' ? 'rgba(16,185,129,0.3)' : 'transparent')}`,
                  borderRadius: 10,
                }}
              >
                They owe me
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-ghost flex-1 px-4 py-2.5 text-sm">Cancel</button>
          <button
            onClick={() => {
              if (name && amount) onAdd({ name, amount: parseFloat(amount), type });
            }}
            className="btn-neon flex-1 px-4 py-2.5 text-sm"
          >
            Add Entry
          </button>
        </div>
      </div>
    </div>
  );
}
