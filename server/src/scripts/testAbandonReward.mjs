import mongoose from 'mongoose';
import 'dotenv/config';
import User from '../models/User.js';
import Match from '../models/Match.js';
import MatchHistory from '../models/MatchHistory.js';
import PlayerStatistics from '../models/PlayerStatistics.js';
import { startMatch, abandonMatch } from '../services/matchService.js';

const uri = process.env.MONGODB_URI;
await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

const mkUser = (n) => new User({
  username: n, name: n, email: `${n}@t.local`, password: 'x'.repeat(8),
  rating: 1500, wins: 0, losses: 0, isActive: true, primaryStack: 'Python'
});

const A = await mkUser('zz_reward_leaver').save();
const B = await mkUser('zz_reward_remain').save();
let matchId = null;
try {
  const m = new Match({
    roomCode: 'ZZTEST', type: 'ranked', status: 'ACTIVE',
    duration: 900, questionCount: 1,
    players: [
      { userId: B._id, username: B.name, ratingBefore: 1500, problemsSolved: 0, status: 'ACTIVE' },
      { userId: A._id, username: A.name, ratingBefore: 1500, problemsSolved: 0, status: 'ACTIVE' }
    ]
  });
  const saved = await m.save();
  matchId = saved._id;

  await abandonMatch(matchId.toString(), A._id.toString());

  const mm = await Match.findById(matchId);
  const pB = mm.players.find(p => p.userId.toString() === B._id.toString());
  const pA = mm.players.find(p => p.userId.toString() === A._id.toString());
  console.log('MATCH status=%s rewardsAwarded=%s abBy=%s', mm.status, mm.rewardsAwarded, mm.abandonedBy);
  console.log('REMAINING(B): rc=%s ra=%s status=%s', pB.ratingChange, pB.ratingAfter, pB.status);
  console.log('LEAVER(A):   rc=%s ra=%s status=%s', pA.ratingChange, pA.ratingAfter, pA.status);
  console.log('rewardDetails=', JSON.stringify(mm.rewardDetails));

  const hB = await MatchHistory.find({ userId: B._id }).sort({ createdAt: -1 }).limit(5).lean();
  const hA = await MatchHistory.find({ userId: A._id }).sort({ createdAt: -1 }).limit(5).lean();
  console.log('B history count=%d', hB.length);
  for (const h of hB) console.log('  B:', h.result, 'rc='+h.ratingChange, 'ra='+h.ratingAfter);
  console.log('A history count=%d', hA.length);
  for (const h of hA) console.log('  A:', h.result, 'rc='+h.ratingChange, 'ra='+h.ratingAfter);

  const uB = await User.findById(B._id);
  const uA = await User.findById(A._id);
  const sB = await PlayerStatistics.findOne({ userId: B._id });
  const sA = await PlayerStatistics.findOne({ userId: A._id });
  console.log('USER B rating=%s wins=%s losses=%s rank=%s', uB.rating, uB.wins, uB.losses, uB.rank);
  console.log('USER A rating=%s wins=%s losses=%s rank=%s', uA.rating, uA.wins, uA.losses, uA.rank);
  console.log('STATS B current=%s wins=%s losses=%s matches=%s', sB?.currentRating, sB?.totalWins, sB?.totalLosses, sB?.totalMatches);
  console.log('STATS A current=%s wins=%s losses=%s matches=%s', sA?.currentRating, sA?.totalWins, sA?.totalLosses, sA?.totalMatches);
} finally {
  // Cleanup
  if (matchId) await Match.deleteMany({ _id: matchId });
  await MatchHistory.deleteMany({ userId: { $in: [A._id, B._id] } });
  await PlayerStatistics.deleteMany({ userId: { $in: [A._id, B._id] } });
  await User.deleteMany({ _id: { $in: [A._id, B._id] } });
  await mongoose.disconnect();
}
