import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import { Award, Trophy, Sparkles, TrendingUp, Check } from 'lucide-react';

interface PersonalBestModalProps {
  isOpen: boolean;
  onClose: () => void;
  previousBest: number;
  currentScore: number;
  improvement: number;
}

export default function PersonalBestModal({
  isOpen,
  onClose,
  previousBest,
  currentScore,
  improvement,
}: PersonalBestModalProps) {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      // Generate lightweight confetti particles
      const colors = ['#a855f7', '#ec4899', '#eab308', '#06b6d4', '#10b981'];
      const p = Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        color: colors[i % colors.length],
      }));
      setParticles(p);

      // Auto dismiss after 6s
      const timer = setTimeout(() => {
        onClose();
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏅 New Personal Best!"
      maxWidth="sm"
      footer={
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xs hover:opacity-90 transition shadow-lg shadow-purple-500/25 active:scale-95"
        >
          Keep It Up!
        </button>
      }
    >
      <div className="space-y-5 text-center relative overflow-hidden py-2">
        {/* Lightweight Confetti Animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute w-2 h-2 rounded-full animate-ping opacity-75"
              style={{
                left: `${p.left}%`,
                top: `${(p.id * 15) % 100}%`,
                backgroundColor: p.color,
                animationDelay: `${p.delay}s`,
                animationDuration: '2s',
              }}
            />
          ))}
        </div>

        {/* Badge Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 via-purple-500 to-pink-500 flex items-center justify-center text-3xl font-black text-white shadow-xl shadow-purple-500/30 mx-auto animate-bounce">
          🏅
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-100" style={{ fontFamily: 'Space Grotesk' }}>
            Arena Record Broken!
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            You achieved your highest Arena Score ever in this period's Productivity Arena league.
          </p>
        </div>

        {/* Score comparison card */}
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-purple-500/30 flex items-center justify-around gap-3 shadow-lg">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Previous Best</div>
            <div className="text-base font-bold text-slate-400 font-mono mt-0.5">{previousBest}</div>
          </div>

          <div className="text-xl font-black text-emerald-400 flex items-center gap-0.5">
            <TrendingUp size={18} /> +{improvement}
          </div>

          <div>
            <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">New Record</div>
            <div className="text-2xl font-black text-purple-300 font-mono mt-0.5">{currentScore}</div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
