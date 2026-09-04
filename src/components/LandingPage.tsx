import React from 'react';
import { BookOpen, Sparkles, ShieldCheck, Lock, ArrowRight, MessageSquareHeart, Compass } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LandingPage: React.FC = () => {
  const { signIn, loading, error, clearError } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="font-semibold text-slate-900 text-lg tracking-tight">AI Journal</span>
        </div>

        <button
          id="btn-landing-top-signin"
          onClick={signIn}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 transition-colors shadow-xs"
        >
          <span>Sign In</span>
          <ArrowRight className="w-4 h-4 text-slate-500" />
        </button>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-4xl mx-auto px-6 py-12 sm:py-20 text-center flex flex-col items-center">
        {/* Subtle pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 mb-8 border border-blue-200/80 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Multi-Turn Gemini Reflective Companion</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-slate-900 max-w-3xl leading-[1.15]">
          A private sanctuary for honest thought and quiet perspective.
        </h1>

        {/* Subtitle */}
        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl leading-relaxed font-normal">
          Reflect on your days, untangle complex emotions, and gain fresh clarity. Each entry is safeguarded in your personal cloud store, strictly isolated for your eyes only.
        </p>

        {/* Error notification banner if any */}
        {error && (
          <div className="mt-6 w-full max-w-md p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={clearError} className="text-red-500 hover:text-red-800 font-bold ml-2">×</button>
          </div>
        )}

        {/* Main CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <button
            id="btn-google-signin"
            onClick={signIn}
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-7 py-3.5 rounded-xl text-sm sm:text-base font-medium text-white bg-slate-900 hover:bg-slate-800 shadow-md transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-70"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          No passwords to manage. Protected by Google Identity and Cloud Firestore rules.
        </p>

        {/* Feature Grid */}
        <div className="mt-16 sm:mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 text-left w-full">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <MessageSquareHeart className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-slate-900">Reflective Companion</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Multi-turn dialogue that remembers your context, asks thoughtful clarifying questions, and helps distill deeper themes without judgment.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-slate-900">Per-User Data Isolation</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Enforced cryptographically at the database level by Firestore Security Rules. Only your authenticated user account can access your entries.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-base text-slate-900">Zero Client Secrets</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              AI requests route through a resilient server proxy with verified Firebase ID tokens. Secrets are shielded from browser exposure.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <div>
          <span>AI Journal &bull; Built with Google Gemini & Firebase Firestore</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Non-clinical reflective journaling companion</span>
        </div>
      </footer>
    </div>
  );
};
