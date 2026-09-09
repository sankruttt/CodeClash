import { joinQueue, leaveQueue, findMatch, getQueueStatus } from '../services/matchmakingService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const joinMatchmaking = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  await joinQueue(userId);
  
  // Try to find an immediate match
  const match = await findMatch(userId);
  
  if (match) {
    return res.json({
      success: true,
      message: 'Match found',
      data: { match, status: 'matched' }
    });
  }
  
  const queue = await getQueueStatus(userId);
  
  res.json({
    success: true,
    message: 'Added to matchmaking queue',
    data: { queue, status: 'searching' }
  });
});

export const leaveMatchmaking = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const removed = await leaveQueue(userId);
  
  res.json({
    success: true,
    message: removed ? 'Left matchmaking queue' : 'Not in queue',
    data: { removed }
  });
});

export const getMatchmakingStatus = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  const status = await getQueueStatus(userId);
  
  res.json({
    success: true,
    data: { status }
  });
});

export default { joinMatchmaking, leaveMatchmaking, getMatchmakingStatus };
