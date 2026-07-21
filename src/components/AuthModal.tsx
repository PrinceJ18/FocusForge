import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getLevelInfo } from "../lib/levels";
import Button from './ui/Button';
import { useStore } from '../store/useStore';
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
  const [error, setError] = useState('');

  if (!open) return null;

  const handleAuth = async () => {
    setLoading(true);
    setError('');

    try {
      if (isSignup) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;

        setError('');
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
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="w-full max-w-md p-6 rounded-2xl"
        style={{
          background: 'rgba(15,15,25,0.95)',
          border: '1px solid rgba(168,85,247,0.2)',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2
              className="text-2xl font-bold"
              style={{ color: 'white' }}
            >
              {isSignup ? 'Create Account' : 'Welcome Back'}
            </h2>

            <p
              className="text-sm mt-1"
              style={{ color: 'var(--text-muted)' }}
            >
              Continue to focusForge
            </p>
          </div>

          <button onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-transparent border"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-transparent border"
          />



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
            className="w-full py-3 rounded-xl border"
          >
            Continue with Google
          </button>

          <button
            onClick={() => setIsSignup(!isSignup)}
            className="w-full text-sm mt-2"
            style={{ color: 'var(--primary)' }}
          >
            {isSignup
              ? 'Already have an account? Sign In'
              : "Don't have an account? Create one"}
          </button>
        </div>
      </div>
    </div>
  );
}

