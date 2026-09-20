import { getBountyStatus, startBounty, finalizeBounty } from '../services/bountyService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const getStatus = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.query?.userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required to view the daily bounty.'
    });
  }

  const status = await getBountyStatus(userId);

  res.json({
    success: true,
    data: status
  });
});

export const start = asyncHandler(async (req, res) => {
  const userId = req.user?.id || req.body?.userId;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentication required to start the daily bounty.'
    });
  }

  const result = await startBounty(userId);

  res.status(201).json({
    success: true,
    message: result.resumed ? 'Bounty resumed' : 'Bounty started',
    data: {
      resumed: result.resumed,
      attempt: result.attempt,
      match: result.match,
      problem: result.problem
    }
  });
});

export const completeBounty = asyncHandler(async (req, res) => {
  const { matchId } = req.params;
  const userId = req.user?.id || req.body?.userId;
  if (!matchId) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'matchId is required'
    });
  }

  const result = await finalizeBounty(matchId, userId);

  if (!result) {
    return res.status(404).json({
      success: false,
      error: 'MATCH_NOT_FOUND',
      message: 'Match not found'
    });
  }

  res.json({
    success: true,
    message: 'Bounty settled',
    match: result.match,
    data: {
      match: result.match,
      attempt: result.attempt,
      solved: result.solved,
      reward: result.reward
    }
  });
});

export default { getStatus, start, completeBounty };