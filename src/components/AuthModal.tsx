import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import Button from './ui/Button';
import { useStore } from '../store/useStore';
import Modal from './ui/Modal';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const showNotification = useStore((s) => s.showNotification);
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuth = async () => {
    setLoading(true);

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        onClose();
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
      }

      onClose();
    } catch (err: any) {
      const message = err.message?.toLowerCase() || '';

      if (message.includes('invalid login credentials')) {
        showNotification({ type: 'error', title: 'Login Failed', message: 'Invalid email or password. If this account was created with Google, please continue with Google.' });
      } else if (message.includes('email not confirmed')) {
        showNotification({ type: 'error', title: 'Email Unconfirmed', message: 'Email verification is required for this account. Try creating the account again.' });
      } else {
        showNotification({ type: 'error', title: 'Authentication Error', message: err.message });
      }
    }

    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={isSignup ? 'Create Account' : 'Welcome Back'}
      subtitle="Continue to FocusForge"
      maxWidth="md"
    >
      <div className="space-y-4 text-left">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-100 placeholder-slate-400 outline-none focus:border-purple-500 transition"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-100 placeholder-slate-400 outline-none focus:border-purple-500 transition"
          />
        </div>

        <Button
          onClick={handleAuth}
          disabled={loading}
          isLoading={loading}
          className="w-full btn-neon py-3 rounded-xl font-medium"
        >
          {isSignup ? 'Create Account' : 'Sign In'}
        </Button>

        <button
          onClick={handleGoogleLogin}
          className="w-full py-3 rounded-xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 text-slate-200 font-medium transition"
        >
          Continue with Google
        </button>

        <button
          onClick={() => setIsSignup(!isSignup)}
          className="w-full text-xs text-purple-400 hover:text-purple-300 font-semibold pt-1 text-center"
        >
          {isSignup
            ? 'Already have an account? Sign In'
            : "Don't have an account? Create one"}
        </button>
      </div>
    </Modal>
  );
}


