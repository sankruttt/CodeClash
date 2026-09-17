import React, { useState, useEffect } from 'react';
import { getTierDetails } from '../utils/tierUtils';
import { authAPI, leaderboardAPI } from '../services/api';

export default function ProfileView({ navigate, currentUser, onUpdateUser }) {
  const [profileData, setProfileData] = useState(currentUser || null);
  const [liveRank, setLiveRank] = useState(currentUser?.rank || null);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editStack, setEditStack] = useState('Python');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  useEffect(() => {
    let isCancelled = false;

    async function loadFreshProfile() {
      try {
        const res = await authAPI.getMe().catch(() => null);
        const u = res?.data?.user || res?.data;
        const streakRes = await authAPI.getStreak().catch(() => null);
        const s = streakRes?.data || streakRes;
        if (u && !isCancelled) {
          setProfileData((prev) => ({
            ...prev,
            ...u,
            name: u.name || u.username,
            username: u.username,
            primaryStack: u.primaryStack || u.stack || 'Python',
            stack: u.primaryStack || u.stack || 'Python',
            streak: Math.max(0, u.streak || 0),
            ...(s && typeof s.streak === 'number' ? {
              streak: Math.max(0, s.streak),
              longestStreak: Math.max(0, s.longestStreak || s.bestStreak || s.streak),
              todayCompleted: s.todayCompleted,
              activityHistory: s.activityHistory,
              weeklyIndicators: s.weeklyIndicators
            } : {})
          }));
          const targetId = u._id || u.id;
          if (targetId) {
            const rankRes = await leaderboardAPI.getUserRank(targetId).catch(() => null);
            const rank = rankRes?.data?.rank || rankRes?.data;
            if (rank && !isCancelled) {
              setLiveRank(rank);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to load fresh profile in ProfileView:', err.message);
      }
    }

    loadFreshProfile();
    return () => {
      isCancelled = true;
    };
  }, [currentUser]);

  const user = profileData || currentUser;
  const rating = user?.rating || 1500;
  const tierInfo = getTierDetails(rating, user?.tier);
  const wins = user?.wins ?? 0;
  const losses = user?.losses ?? 0;
  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0';
  const streak = Math.max(0, user?.streak ?? 0);
  const longestStreak = Math.max(0, user?.longestStreak ?? user?.bestStreak ?? streak);
  const todayCompleted = Boolean(user?.todayCompleted);
  const streakDisplay = `${streak} ${streak === 1 ? 'DAY' : 'DAYS'}`;
  const rankDisplay = liveRank ? `#${liveRank}` : user?.rank ? `#${user.rank}` : 'Unranked';

  const handleOpenEdit = () => {
    setEditName(user?.name || user?.username || '');
    setEditUsername(user?.username || '');
    setEditStack(user?.primaryStack || user?.stack || 'Python');
    setSaveError('');
    setSaveSuccess('');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setSaveError('');
    setSaveSuccess('');
  };

  const handleSaveProfile = async (e) => {
    if (e) e.preventDefault();
    setSaveError('');
    setSaveSuccess('');

    const trimmedName = editName.trim();
    const trimmedUsername = editUsername.trim();

    if (!trimmedName) {
      setSaveError('Display Name cannot be empty');
      return;
    }

    if (!trimmedUsername) {
      setSaveError('Username cannot be empty');
      return;
    }

    if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
      setSaveError('Username must be between 3 and 30 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_.-]+$/.test(trimmedUsername)) {
      setSaveError('Username can only contain letters, numbers, underscores, dashes, or dots');
      return;
    }

    const currentName = user?.name || user?.username || '';
    const currentUsername = user?.username || '';
    const currentStack = user?.primaryStack || user?.stack || 'Python';

    if (trimmedName === currentName && trimmedUsername === currentUsername && editStack === currentStack) {
      setSaveSuccess('No changes to save.');
      setTimeout(() => setIsEditing(false), 800);
      return;
    }

    setIsSaving(true);
    try {
      const res = await authAPI.updateProfile({
        name: trimmedName,
        username: trimmedUsername,
        primaryStack: editStack,
      });

      if (res?.success && res.data) {
        const updatedUser = res.data.user;
        const newToken = res.data.token;

        setProfileData((prev) => ({
          ...prev,
          ...updatedUser,
          name: updatedUser.name || updatedUser.username,
          username: updatedUser.username,
          handle: `@${updatedUser.username}`,
          primaryStack: updatedUser.primaryStack || editStack,
          stack: updatedUser.primaryStack || editStack,
          avatar: updatedUser.avatar || (updatedUser.name || updatedUser.username).slice(0, 2).toUpperCase()
        }));

        if (onUpdateUser) {
          onUpdateUser({ ...updatedUser, primaryStack: editStack, stack: editStack }, newToken);
        }

        setSaveSuccess('✓ Profile updated successfully!');
        setTimeout(() => {
          setIsEditing(false);
          setSaveSuccess('');
        }, 900);
      } else {
        throw new Error(res?.message || 'Failed to update profile');
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const masteryCategories = [
    { name: 'Dynamic Programming & Memoization', tier: 'Grandmaster', pct: 96, color: 'bg-indigo-600' },
    { name: 'Graph Theory & Network Flow', tier: 'Apex', pct: 91, color: 'bg-sky-500' },
    { name: 'Advanced Data Structures (Trie, Segment)', tier: 'Diamond', pct: 88, color: 'bg-emerald-500' },
    { name: 'Concurrency & Locks', tier: 'Master', pct: 82, color: 'bg-purple-600' },
    { name: 'Greedy & Monotonic Queues', tier: 'Diamond', pct: 79, color: 'bg-amber-500' },
  ];

  return (
    <div className="flex-1 min-w-0 px-4 pt-4 sm:px-6 sm:pt-6 pb-48 subtle-grid">
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Combatant Hero Profile Header */}
        <section className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-sky-400 text-white font-mono font-black flex items-center justify-center text-2xl shadow-md ring-4 ring-indigo-50">
                  {user?.avatar || (user?.name || user?.username || 'KV').slice(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-[10px] font-bold ring-2 ring-white">
                  ONLINE
                </span>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {user?.name || user?.username || 'Combatant'}
                  </h1>
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-xs font-semibold border border-indigo-200">
                    {tierInfo.currentTier.toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono text-xs font-semibold border border-emerald-200 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">code</span>
                    <span>{user?.primaryStack || user?.stack || 'Python'}</span>
                  </span>
                </div>
                <div className="font-mono text-xs text-indigo-600 font-medium mt-0.5">
                  {user?.handle || (user?.username ? `@${user.username}` : '@combatant')}
                </div>
                <p className="text-xs text-slate-500 mt-1 font-sans">
                  Competitive algorithmic duelist. Specializing in high-frequency graphs and concurrency vectors.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleOpenEdit}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 active:scale-[0.99] text-slate-700 font-mono text-xs font-semibold tracking-wider flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Edit Name and Username"
              >
                <span className="material-symbols-outlined text-sm text-indigo-600">edit</span>
                <span>EDIT PROFILE</span>
              </button>

              <button
                onClick={() => navigate('lobby')}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-semibold tracking-wider flex items-center gap-2 shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-sm">swords</span>
                <span>CHALLENGE TO DUEL</span>
              </button>
            </div>
          </div>

          {/* Tier & LP Progression Banner */}
          <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold tracking-wider">
                  {tierInfo.currentTier.toUpperCase()}
                </span>
                <span className="text-xs font-semibold text-slate-800 font-sans">
                  Tier Path: <strong className="font-mono text-indigo-600 font-bold">{tierInfo.currentTier}</strong> →{' '}
                  <strong className="font-mono text-slate-900">{tierInfo.nextTier} ({tierInfo.nextTierLP.toLocaleString()} LP)</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500">
                  <strong className="text-slate-900 font-bold">{rating.toLocaleString()}</strong> / {tierInfo.nextTierLP.toLocaleString()} LP ({tierInfo.pct}%)
                </span>
                <span className="text-slate-300">•</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">keyboard_double_arrow_up</span>
                  {tierInfo.lpNeeded} LP needed to reach {tierInfo.nextTier}
                </span>
              </div>
            </div>

            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden border border-slate-200/60">
              <div
                className="bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-500 shadow-2xs"
                style={{ width: `${tierInfo.pct}%` }}
              />
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100 font-mono">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div className="text-[10px] uppercase text-slate-400 font-medium">Rating LP</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">
                {rating.toLocaleString()} <span className="text-xs text-indigo-600 font-normal">LP</span>
              </div>
              <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                <span>Active ({tierInfo.currentTier})</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div className="text-[10px] uppercase text-slate-400 font-medium">Global Ladder</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{rankDisplay}</div>
              <div className="text-[10px] text-slate-500 mt-1">Live Competitive Standing</div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div className="text-[10px] uppercase text-slate-400 font-medium">Duel Win Rate</div>
              <div className="text-2xl font-black text-slate-900 mt-0.5">{winRate}%</div>
              <div className="text-[10px] text-slate-500 mt-1">{wins}W - {losses}L ({totalMatches} Matches)</div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div className="flex items-center justify-between text-[10px] uppercase text-slate-400 font-medium">
                <span>Daily Streak</span>
                <span className="material-symbols-outlined text-xs text-amber-500">local_fire_department</span>
              </div>
              <div className="text-2xl font-black text-amber-600 mt-0.5">{streakDisplay}</div>
              <div className={`text-[10px] font-semibold mt-1 ${todayCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
                {todayCompleted
                  ? `✓ Active Today • Record: ${longestStreak}d`
                  : `Pending Today • Best: ${longestStreak}d`}
              </div>
            </div>
          </div>
        </section>

        {/* 2-Column Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (7 cols): Algorithmic Mastery Matrix */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-indigo-600 uppercase tracking-wider font-semibold">
                  <span className="material-symbols-outlined text-sm">hub</span>
                  <span>Category Breakdown</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 mt-0.5">
                  Algorithmic Mastery Matrix
                </h2>
              </div>
              <span className="font-mono text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">
                Normalized vs 2,200+ LP
              </span>
            </div>

            <div className="space-y-4">
              {masteryCategories.map((cat) => (
                <div key={cat.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{cat.name}</span>
                      <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {cat.tier}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900">{cat.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div className={`h-full ${cat.color} rounded-full`} style={{ width: `${cat.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column (5 cols): Tier Progression & Clan */}
          <div className="lg:col-span-5 space-y-5">
            {/* Tier & LP to Next Tier Progression Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 font-mono">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-indigo-600">military_tech</span>
                  <h3 className="font-bold text-slate-900 text-sm font-sans">
                    Combatant Tier Progression
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                  {tierInfo.currentTier.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                  <span className="text-slate-500 uppercase text-[11px]">Current Tier</span>
                  <span className="font-bold text-slate-900">{tierInfo.currentTier}</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                  <span className="text-slate-500 uppercase text-[11px]">Next Milestone</span>
                  <span className="font-bold text-indigo-600">{tierInfo.nextTier} ({tierInfo.nextTierLP.toLocaleString()} LP)</span>
                </div>
                <div className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-200/70">
                  <span className="text-slate-500 uppercase text-[11px]">Current Rating</span>
                  <span className="font-bold text-slate-900">{rating.toLocaleString()} / {tierInfo.nextTierLP.toLocaleString()} LP ({tierInfo.pct}%)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200/70 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600 text-lg">bolt</span>
                    <div>
                      <div className="font-sans text-xs font-bold text-slate-900">LP Needed for Next Tier</div>
                      <div className="font-mono text-[10px] text-slate-500">{tierInfo.lpNeeded} LP to promote to {tierInfo.nextTier}</div>
                    </div>
                  </div>
                  <span className="font-mono font-black text-base text-indigo-600 bg-white px-2.5 py-1 rounded-lg border border-indigo-100 shadow-2xs">
                    {tierInfo.lpNeeded} LP
                  </span>
                </div>
              </div>
            </div>

            {/* Clan / Guild Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3 font-mono">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-bold flex items-center justify-center text-sm">
                  AP
                </div>
                <div>
                  <div className="text-slate-900 font-bold text-sm">Clan [APEX]</div>
                  <div className="text-slate-400 text-xs">Top 3 Global Competitive Syndicate</div>
                </div>
              </div>
              <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-mono font-semibold">
                Member
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200/90 shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-mono">
                  <span className="material-symbols-outlined text-lg">manage_accounts</span>
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 font-sans">Edit Profile</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Update combatant credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={isSaving}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {saveError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-mono flex items-start gap-2">
                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">error</span>
                <span className="flex-1">{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-mono flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-emerald-600 shrink-0">check_circle</span>
                <span>{saveSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-700 mb-1.5 font-sans">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Commander Kaelen"
                  disabled={isSaving}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all shadow-2xs"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  The name displayed on your profile, combat rooms, and match HUD.
                </span>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-700 mb-1.5 font-sans">
                  Username (@handle)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400 font-mono text-xs">@</span>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value.trim())}
                    placeholder="e.g. kaelen_v"
                    disabled={isSaving}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-3 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all shadow-2xs"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  3–30 chars (letters, numbers, _, -, .). Must be unique across all players.
                </span>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-700 mb-1.5 font-sans">
                  Primary Stack
                </label>
                <div className="relative flex items-center">
                  <select
                    value={editStack}
                    onChange={(e) => setEditStack(e.target.value)}
                    disabled={isSaving}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-sans text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all shadow-2xs cursor-pointer appearance-none pr-8"
                  >
                    <option value="Python">Python (Python 3.14)</option>
                    <option value="JavaScript">JavaScript (Deno)</option>
                    <option value="C++">C++ (G++ 15)</option>
                    <option value="Java">Java (OpenJDK 25)</option>
                    <option value="C">C (GCC 15)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-2.5 text-slate-400 pointer-events-none text-base">
                    expand_more
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Your designated competitive language stack displayed on the global leaderboard.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs tracking-wider transition-colors cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs tracking-wider flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      <span>SAVING...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span>SAVE CHANGES</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
