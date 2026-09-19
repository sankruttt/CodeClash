import React, { useState } from 'react';
import logoImg from '../assets/codeclash-logo.png';
import { authAPI, setAuthToken } from '../services/api';

const STITCH_LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1VkaA6KQmBEfQfLHrYIjjR4oGKWIHp1_CurDV8dkUOLfm1wboPXJDDOmiO5_Q53SFKmerv3V5dASxAes2QZ-yTXXenCF6yKwyLIXHfUUPl8D8tSTN5le0QvrjWh8S6juas_AMrCR3zcvP88ujMW1j8OexMQ66cxqVtd5iNHn2TfzJFyMz6Y7pPsl3P16O_L7a-ZoUxxhgm52M3B-owITbZTNWjcuONl60VhdeU7hfHLiuFQ31CuCvkvAkk';

export default function LandingLoginView({ navigate, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const res = await authAPI.login(email.trim(), password);
      if (res && res.data && res.data.token) {
        setAuthToken(res.data.token);
        if (onLoginSuccess) {
          onLoginSuccess({ user: res.data.user, token: res.data.token });
        } else {
          navigate('dashboard');
        }
      } else {
        throw new Error(res?.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
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

            <p className="text-center text-sm text-slate-500 mb-6 font-normal leading-normal max-w-sm mx-auto">
              Authenticate via encrypted neural handshake to resume ladder climb.
            </p>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-mono text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-sm shrink-0">error</span>
                <span>{errorMessage}</span>
              </div>
            )}

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
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 px-6 rounded-lg font-extrabold text-sm tracking-wider uppercase flex items-center justify-center space-x-2 transition duration-150 shadow-md ${isLoading
                      ? 'bg-indigo-400 text-white cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white shadow-indigo-500/25 cursor-pointer'
                    }`}
                >
                  <span>{isLoading ? 'AUTHENTICATING...' : 'ENTER THE ARENA'}</span>
                  <span className="text-base font-black">↗</span>
                </button>
              </div>
            </form>

            <div className="mt-6 text-center text-xs font-mono text-slate-500">
              Need to create a combat profile?{' '}
              <button
                type="button"
                onClick={() => navigate('register')}
                className="text-indigo-600 hover:text-indigo-700 font-bold underline underline-offset-4 cursor-pointer"
              >
                Register Now
              </button>
            </div>
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
