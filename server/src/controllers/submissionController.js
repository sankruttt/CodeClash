import { submitCode, getSubmissionsByMatch } from '../services/submissionService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const submit = asyncHandler(async (req, res) => {
  const { matchId, problemId, code, language } = req.body;
  const userId = req.user.id;
  
  const result = await submitCode({ userId, matchId, problemId, code, language });
  
  res.status(201).json({
    success: true,
    message: 'Code submitted',
    data: result
  });
});

export const getMatchSubmissions = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const userId = req.user.id;
  
  const submissions = await getSubmissionsByMatch(matchId, userId);
  
  res.json({
    success: true,
    data: { submissions }
  });
});

export default { submit, getMatchSubmissions };
