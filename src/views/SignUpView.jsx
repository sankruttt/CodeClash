import React, { useState } from 'react';
import logoImg from '../assets/codeclash-logo.png';

const STITCH_LOGO_URL =
  'https://lh3.googleusercontent.com/aida/AEtjO1VkaA6KQmBEfQfLHrYIjjR4oGKWIHp1_CurDV8dkUOLfm1wboPXJDDOmiO5_Q53SFKmerv3V5dASxAes2QZ-yTXXenCF6yKwyLIXHfUUPl8D8tSTN5le0QvrjWh8S6juas_AMrCR3zcvP88ujMW1j8OexMQ66cxqVtd5iNHn2TfzJFyMz6Y7pPsl3P16O_L7a-ZoUxxhgm52M3B-owITbZTNWjcuONl60VhdeU7hfHLiuFQ31CuCvkvAkk';

export default function SignUpView({ navigate, onSignUpSuccess }) {
  const [fullname, setFullname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const getInitials = (name) => {
    if (!name) return 'CC';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'CC';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSignUpSuccess) {
      onSignUpSuccess({
        name: fullname,
        handle: `@${username.replace(/^@/, '')}`,
        email,
        avatar: getInitials(fullname),
      });
    } else {
      navigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-slate-900 font-sans antialiased flex flex-col justify-between selection:bg-indigo-500 selection:text-white surgical-grid">
      {/* Header */}
      <header className="w-full border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 sm:px-8 py-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('login')}>
          <img
            alt="Code Clash Logo"
            className="h-8 w-auto object-contain transition-transform hover:scale-105"
            src={STITCH_LOGO_URL}
            onError={(e) => {
              e.currentTarget.src = logoImg;
            }}
          />
          <span className="font-mono font-bold tracking-wider text-slate-900 text-lg ml-2">
            CODE<span className="text-indigo-600">CLASH</span>
          </span>
        </div>

        <div className="flex items-center">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
            GRID STATUS: <strong className="text-slate-700">1,248 ONLINE</strong>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-6 sm:px-8 py-10 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Hero Panel */}
        <section className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center">
          <div className="max-w-xl">
            <h1 className="text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.08] mb-6">
              Code pure.
              <br />
              <span className="text-indigo-600">Clash harder.</span>
            </h1>
            <p className="text-base lg:text-lg text-slate-600 max-w-lg mb-8 leading-relaxed">
              A focused arena for developers who want the pressure of competitive code clashes and the proof of a hard-earned rank.
            </p>

            <div className="flex flex-col space-y-3 mb-8">
              <div className="flex items-center space-x-3 text-slate-700 font-medium text-sm">
                <span className="text-indigo-600 font-bold">✓</span>
                <span>Rated 1v1 duels with LP progression</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-700 font-medium text-sm">
                <span className="text-indigo-600 font-bold">✓</span>
                <span>Real-time AST parsing &amp; micro-benchmarks</span>
              </div>
              <div className="flex items-center space-x-3 text-slate-700 font-medium text-sm">
                <span className="text-indigo-600 font-bold">✓</span>
                <span>Private scrimmage rooms &amp; tournament ladders</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Form Panel */}
        <section className="lg:col-span-6 xl:col-span-5 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/50 p-8 sm:p-10">
            <div className="text-center font-mono text-xs uppercase tracking-widest text-indigo-600 font-semibold mb-2">
              GET STARTED
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-center mb-2">
              Create your combatant account
            </h2>
            <p className="text-sm text-slate-500 text-center mb-6 leading-normal">
              Reserve your handle globally and calibrate your battle environment.
            </p>

            <div className="flex border-b border-slate-200 mb-6 font-mono text-xs tracking-wider">
              <button
                type="button"
                onClick={() => navigate('login')}
                className="flex-1 py-3 text-slate-400 hover:text-slate-800 uppercase transition-colors text-center font-medium"
              >
                Sign In
              </button>
              <button
                type="button"
                className="flex-1 py-3 text-indigo-600 uppercase font-bold text-center border-b-2 border-indigo-600"
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-600 font-semibold mb-1.5" htmlFor="fullname">
                  Full Name or Alias
                </label>
                <input
                  id="fullname"
                  type="text"
                  required
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  placeholder="e.g. Cadet Alias"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 input-glow transition-all font-sans"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-mono uppercase tracking-wider mb-1.5">
                  <label className="text-slate-600 font-semibold" htmlFor="username">
                    Battle Username / Callsign
                  </label>
                  <span className="text-emerald-600 font-semibold px-2 py-0.5 rounded bg-emerald-50 text-[10px]">
                    ✓ Available
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400 font-mono text-sm select-none">@</span>
                  <input
                    id="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/^@/, ''))}
                    placeholder="callsign"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 input-glow font-mono transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-[11px] uppercase tracking-wider text-slate-600 font-semibold mb-1.5" htmlFor="signup-email">
                  Email Address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@codeclash.dev"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 input-glow transition-all font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-mono uppercase tracking-wider mb-1.5">
                  <label className="text-slate-600 font-semibold" htmlFor="signup-password">
                    Passkey / Password
                  </label>
                  <span className="text-emerald-600 font-mono text-[10px] font-semibold">
                    Strong (84/100)
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    id="signup-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="8 characters minimum"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 input-glow transition-all pr-10 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                    className="absolute right-3 text-slate-400 hover:text-slate-700 transition-colors p-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-mono font-semibold text-xs tracking-wider uppercase rounded-lg shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 group transition-all"
                >
                  <span>Initialize Combatant &amp; Enter</span>
                  <span className="text-base leading-none transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                    ↗
                  </span>
                </button>
              </div>
            </form>

            <div className="relative flex items-center justify-center my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <span className="relative bg-white px-3 text-[10px] uppercase tracking-widest text-slate-400 font-mono font-medium text-center">
                OR CONTINUE WITH
              </span>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg font-medium text-sm text-slate-700 flex items-center justify-center gap-2 shadow-2xs transition"
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
      <footer className="w-full border-t border-slate-200/60 bg-white/40 px-8 py-5 flex items-center justify-between text-xs font-mono text-slate-400">
        <div>© 2026 CODE CLASH</div>
        <div className="flex items-center gap-4">
          <span>PROTOCOL v2.4</span>
          <span>·</span>
          <span>SYSTEM HEALTH: OPTIMAL</span>
        </div>
      </footer>
    </div>
  );
}
