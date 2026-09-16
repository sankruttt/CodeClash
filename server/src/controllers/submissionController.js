import { submitCode, getSubmissionsByMatch } from '../services/submissionService.js';
import { executeCode } from '../services/compilerService.js';
import { recordUserActivity } from '../services/streakService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const submit = asyncHandler(async (req, res) => {
  const { matchId, problemId, code, language } = req.body;
  const userId = req.user?.id || req.body.playerId || 'guest_player';

  const result = await submitCode({ userId, matchId, problemId, code, language });

  let streakData = null;
  if (userId && !String(userId).startsWith('guest_')) {
    streakData = await recordUserActivity(userId).catch(() => null);
  }

  res.status(200).json({
    success: true,
    message: 'Code submitted',
    data: {
      ...result,
      status: result.submission?.status || 'Accepted',
      submission: result.submission,
      streak: streakData
    }
  });
});

export const getMatchSubmissions = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const userId = req.user?.id || req.query.playerId || 'guest_player';

  const submissions = await getSubmissionsByMatch(matchId, userId);

  res.json({
    success: true,
    data: { submissions }
  });
});

export const run = asyncHandler(async (req, res) => {
  const { code, language = 'javascript', stdin = '', testCases = [] } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Code cannot be empty'
    });
  }

  const result = await executeCode({ code, language, stdin, testCases });

  res.json({
    success: true,
    data: result
  });
});

export default { submit, getMatchSubmissions, run };
