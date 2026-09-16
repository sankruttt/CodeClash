import React, { useState } from 'react';
import logoImg from '../assets/codeclash-logo.png';

const STITCH_LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1VkaA6KQmBEfQfLHrYIjjR4oGKWIHp1_CurDV8dkUOLfm1wboPXJDDOmiO5_Q53SFKmerv3V5dASxAes2QZ-yTXXenCF6yKwyLIXHfUUPl8D8tSTN5le0QvrjWh8S6juas_AMrCR3zcvP88ujMW1j8OexMQ66cxqVtd5iNHn2TfzJFyMz6Y7pPsl3P16O_L7a-ZoUxxhgm52M3B-owITbZTNWjcuONl60VhdeU7hfHLiuFQ31CuCvkvAkk';

export default function LandingLoginView({ navigate, onLoginSuccess }) {
  const [email, setEmail] = useState('alex@codeclash.dev');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onLoginSuccess) {
      onLoginSuccess({ email });
    } else {
      navigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8ff] text-[#0f172a] surgical-grid selection:bg-indigo-100 selection:text-indigo-900">
      {/* Main Header */}
      <header className="w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1720px] mx-auto px-6 sm:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('login')}>
            <div className="relative w-8 h-8 flex items-center justify-center">
              <img
                alt="CodeClash Emblem"
                className="w-8 h-8 object-contain"
                src={STITCH_LOGO_URL}
                onError={(e) => {
                  e.currentTarget.src = logoImg;
                }}
              />
            </div>
            <span className="font-mono text-xl font-bold tracking-wider text-slate-900 uppercase select-none">
              CODE<span className="text-indigo-600">CLASH</span>
            </span>
          </div>

          <div className="text-xs font-mono tracking-widest text-slate-500 uppercase flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>• GRID STATUS: 1,248 ONLINE</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 sm:px-8 py-10 grid grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Hero Section */}
        <section className="col-span-12 lg:col-span-7 flex flex-col justify-center max-w-2xl lg:max-w-none pr-0 lg:pr-6">
          <div className="mb-4 flex items-center space-x-2">
            <span className="font-mono text-xs tracking-widest font-semibold text-slate-500 uppercase">
              &gt; THE NEXT MATCH STARTS HERE
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.08] mb-6">
            Think fast.
            <span className="text-indigo-600 block">Climb higher.</span>
          </h1>

          <p className="text-slate-600 text-lg sm:text-xl font-normal leading-relaxed mb-8 max-w-xl">
            A focused arena for developers who want the pressure of a live duel and the proof of a hard-earned rank.
          </p>

          <div className="flex flex-col space-y-3 mb-8 font-medium text-slate-800">
            <div className="flex items-center space-x-3">
              <span className="text-indigo-600 font-bold text-lg leading-none">✓</span>
              <span className="text-base tracking-wide text-slate-700">Rated 1v1 duels</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-indigo-600 font-bold text-lg leading-none">✓</span>
              <span className="text-base tracking-wide text-slate-700">Real-time AST judging</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-indigo-600 font-bold text-lg leading-none">✓</span>
              <span className="text-base tracking-wide text-slate-700">Private lobbies &amp; scrimmage sandbox</span>
            </div>
          </div>
        </section>

        {/* Right Auth Console */}
        <section className="col-span-12 lg:col-span-5 flex justify-center lg:justify-end">
          <div className="w-full max-w-[480px] bg-white rounded-2xl border border-slate-200/80 p-8 sm:p-10 shadow-xl shadow-slate-200/50 relative">
            <div className="text-center mb-2">
              <span className="font-mono text-xs uppercase tracking-[0.2em] font-semibold text-indigo-600">
                WELCOME BACK
              </span>
            </div>

            <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2.5">
              Ready for your next duel?
            </h2>

            <p className="text-center text-sm text-slate-500 mb-8 font-normal leading-normal max-w-sm mx-auto">
              Sign in to keep your streak alive and see who is waiting in the lobby.
            </p>

            {/* Tab Selector: SIGN IN vs CREATE ACCOUNT */}
            <div className="border-b border-slate-200 grid grid-cols-2 mb-8">
              <button
                type="button"
                className="pb-3 text-center font-mono text-xs uppercase tracking-wider font-bold text-indigo-600 border-b-2 border-indigo-600 transition-colors"
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => navigate('register')}
                className="pb-3 text-center font-mono text-xs uppercase tracking-wider font-medium text-slate-500 hover:text-slate-800 border-b-2 border-transparent transition-colors"
              >
                CREATE ACCOUNT
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-2" htmlFor="email">
                  EMAIL ADDRESS
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="clean-input w-full px-4 py-3 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:bg-white focus:outline-none transition-all font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-600" htmlFor="password">
                    PASSWORD
                  </label>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 characters minimum"
                    className="clean-input w-full px-4 py-3 pr-11 bg-slate-50 text-slate-900 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:bg-white focus:outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
                <div className="flex justify-end mt-2">
                  <a href="#forgot" className="text-xs text-slate-500 hover:text-indigo-600 underline underline-offset-4 transition-colors">
                    Forgot password?
                  </a>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-extrabold text-sm tracking-wider uppercase flex items-center justify-center space-x-2 transition duration-150 shadow-md shadow-indigo-500/25"
                >
                  <span>ENTER THE ARENA</span>
                  <span className="text-base font-black">↗</span>
                </button>
              </div>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 font-mono text-[11px] tracking-wider uppercase text-slate-400">
                  OR CONTINUE WITH
                </span>
              </div>
            </div>

            {/* Google OAuth Button */}
            <button
              type="button"
              onClick={handleSubmit}
              className="w-full py-2.5 px-4 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-lg text-sm font-semibold text-slate-800 flex items-center justify-center space-x-2.5 transition-colors duration-150 shadow-xs"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"></path>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"></path>
              </svg>
              <span>Google Account</span>
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200/80 py-5 text-xs text-slate-500 bg-white/50 backdrop-blur-xs mt-auto">
        <div className="max-w-[1720px] mx-auto px-6 sm:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-mono text-slate-600">© 2026 CODE CLASH // ALL PROTOCOLS VERIFIED</span>
          <div className="font-mono text-slate-500 flex items-center gap-4 text-xs">
            <span>PROTOCOL v2.4</span>
            <span>•</span>
            <span>SYSTEM HEALTH: OPTIMAL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
