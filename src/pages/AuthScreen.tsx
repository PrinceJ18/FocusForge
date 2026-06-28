
import React, { useState } from 'react';
import { ArrowRight, Zap, Brain, Wallet } from 'lucide-react';
import AuthModal from '../components/AuthModal';

export default function AuthScreen() {
    const [authOpen, setAuthOpen] = useState(false);

    return (
        <>
            <div
                className="min-h-screen flex items-center justify-center px-6"
                style={{
                    background:
                        'radial-gradient(circle at top, rgba(168,85,247,0.15), transparent 40%), #050510',
                }}
            >
                <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center">
                    {/* LEFT SIDE */}
                    <div>
                        <div
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                            style={{
                                background: 'rgba(168,85,247,0.1)',
                                border: '1px solid rgba(168,85,247,0.2)',
                            }}
                        >
                            <Zap size={16} color="#c084fc" />
                            <span
                                className="text-sm"
                                style={{ color: '#c084fc' }}
                            >
                                AI-Powered Student Productivity Platform
                            </span>
                        </div>

                        <h1
                            className="text-5xl lg:text-7xl font-black leading-tight"
                            style={{ color: 'white' }}
                        >
                            Build Better
                            <span
                                style={{
                                    background:
                                        'linear-gradient(135deg,#a855f7,#ec4899)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    display: 'block',
                                }}
                            >
                                Focus Habits
                            </span>
                        </h1>

                        <p
                            className="mt-6 text-lg max-w-xl leading-relaxed"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            focusForge helps students track productivity,
                            manage expenses, build consistency, and improve
                            focus through AI-powered analytics.
                        </p>

                        <div className="mt-10 flex flex-wrap gap-4">
                            <button
                                onClick={() => setAuthOpen(true)}
                                className="btn-neon px-6 py-4 rounded-16 font-semibold flex items-center gap-2"
                            >
                                Get Started
                                <ArrowRight size={18} />
                            </button>
                        </div>

                        <div className="mt-14 grid sm:grid-cols-3 gap-4">
                            <FeatureCard
                                icon={<Brain size={20} />}
                                title="Productivity"
                                text="Track focus & study sessions"
                            />

                            <FeatureCard
                                icon={<Wallet size={20} />}
                                title="Finance"
                                text="Manage budget & spending"
                            />

                            <FeatureCard
                                icon={<Zap size={20} />}
                                title="Analytics"
                                text="AI-powered smart insights"
                            />
                        </div>
                    </div>

                    {/* RIGHT SIDE */}
                    <div className="relative hidden lg:block">
                        <div
                            className="glass-card p-8 rounded-24"
                            style={{
                                background: 'rgba(15,15,25,0.7)',
                                border: '1px solid rgba(168,85,247,0.2)',
                            }}
                        >
                            <div className="space-y-6">
                                <DashboardPreview />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AuthModal
                open={authOpen}
                onClose={() => setAuthOpen(false)}
            />
        </>
    );
}

function FeatureCard({
    icon,
    title,
    text,
}: {
    icon: React.ReactNode;
    title: string;
    text: string;
}) {
    return (
        <div
            className="p-5 rounded-20"
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <div style={{ color: '#c084fc' }}>{icon}</div>

            <h3
                className="mt-4 font-semibold"
                style={{ color: 'white' }}
            >
                {title}
            </h3>

            <p
                className="mt-1 text-sm"
                style={{ color: 'var(--text-secondary)' }}
            >
                {text}
            </p>
        </div>
    );
}

function DashboardPreview() {
    return (
        <div className="space-y-5">
            <div
                className="p-5 rounded-20"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(236,72,153,0.1))',
                }}
            >
                <p
                    className="text-sm"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    Focus Score
                </p>

                <h2
                    className="text-4xl font-black mt-2"
                    style={{ color: 'white' }}
                >
                    92%
                </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <MiniCard title="Study Hours" value="38h" />
                <MiniCard title="Savings" value="₹4,200" />
            </div>

            <div
                className="p-5 rounded-20"
                style={{
                    background: 'rgba(255,255,255,0.03)',
                }}
            >
                <div className="flex justify-between mb-2">
                    <span style={{ color: 'var(--text-secondary)' }}>
                        Weekly Progress
                    </span>

                    <span style={{ color: '#c084fc' }}>78%</span>
                </div>

                <div
                    className="w-full h-3 rounded-full"
                    style={{
                        background: 'rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        className="h-3 rounded-full"
                        style={{
                            width: '78%',
                            background:
                                'linear-gradient(135deg,#a855f7,#ec4899)',
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

function MiniCard({
    title,
    value,
}: {
    title: string;
    value: string;
}) {
    return (
        <div
            className="p-5 rounded-20"
            style={{
                background: 'rgba(255,255,255,0.03)',
            }}
        >
            <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
            >
                {title}
            </p>

            <h3
                className="text-2xl font-bold mt-2"
                style={{ color: 'white' }}
            >
                {value}
            </h3>
        </div>
    );
}

