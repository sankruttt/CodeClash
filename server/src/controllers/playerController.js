import { asyncHandler } from '../middleware/errorHandler.js';
import * as playerService from '../services/playerService.js';

export const register = asyncHandler(async (req, res) => {
  const { id, name, rating = 1500 } = req.body;

  if (!id || !name) {
    return res.status(400).json({
      success: false,
      error: 'Player ID and name are required',
      message: 'Player ID and name are required'
    });
  }

  const player = await playerService.registerPlayer({ id, name, rating });

  res.json({
    success: true,
    player,
    data: { player }
  });
});

export const getPlayer = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const player = await playerService.getPlayerById(id);
  if (!player) {
    return res.status(404).json({
      success: false,
      error: 'Player not found',
      message: 'Player not found'
    });
  }

  res.json({
    success: true,
    player,
    data: { player }
  });
});

export default {
  register,
  getPlayer
};
