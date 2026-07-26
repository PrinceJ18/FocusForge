import React from 'react';
import Modal from '../ui/Modal';
import { Crown, Trophy, Flame, Sparkles, Award } from 'lucide-react';

interface ChampionModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  score: number;
  winningStreak: number;
}

export default function ChampionModal({
  isOpen,
  onClose,
  username,
  score,
  winningStreak,
}: ChampionModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="👑 Weekly Champion!"
      maxWidth="sm"
      footer={
        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white font-black text-xs hover:opacity-90 transition shadow-xl shadow-amber-500/25 active:scale-95 uppercase tracking-wider"
        >
          Claim Champion Glory 🏆
        </button>
      }
    >
      <div className="space-y-5 text-center py-2 relative overflow-hidden">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-pink-500 flex items-center justify-center text-4xl font-black text-white shadow-2xl shadow-amber-500/40 mx-auto relative animate-bounce">
          <Crown size={28} className="absolute -top-3 -right-3 text-amber-300" />
          👑
        </div>

        <div>
          <h3 className="text-xl font-black text-amber-300" style={{ fontFamily: 'Space Grotesk' }}>
            You Are #1 This Week!
          </h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">
            Congratulations <span className="font-bold text-white">{username}</span>! You dominated Productivity Arena with top focus and task execution.
          </p>
        </div>

        <div className="p-4 bg-slate-950/90 rounded-2xl border border-amber-500/40 grid grid-cols-2 gap-3 shadow-lg">
          <div className="p-3 bg-slate-900/60 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Champion Score</div>
            <div className="text-xl font-black text-amber-300 font-mono mt-0.5">{score} pts</div>
          </div>

          <div className="p-3 bg-slate-900/60 rounded-xl">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Winning Streak</div>
            <div className="text-xl font-black text-slate-200 mt-0.5 flex items-center justify-center gap-1">
              <Flame size={16} className="text-amber-400" /> {winningStreak}w
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
