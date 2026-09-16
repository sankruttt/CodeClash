import { isMongoConnected } from '../config/database.js';
import Player from '../models/Player.js';
import { inMemoryStore } from './inMemoryStore.js';

export async function registerPlayer({ id, name, rating = 1500 }) {
  if (!id || !name) {
    const err = new Error('Player ID and name are required');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  if (isMongoConnected()) {
    const player = await Player.findOneAndUpdate(
      { playerId: id },
      {
        $set: { name, rating, lastSeen: new Date() },
        $setOnInsert: { wins: 0, losses: 0 }
      },
      { returnDocument: 'after', upsert: true }
    );
    return player.toJSON ? player.toJSON() : player;
  }

  return inMemoryStore.registerPlayer({ id, name, rating });
}

export async function getPlayerById(id) {
  if (!id) return null;

  if (isMongoConnected()) {
    const player = await Player.findOne({ playerId: id });
    return player ? (player.toJSON ? player.toJSON() : player) : null;
  }

  return inMemoryStore.getPlayer(id);
}

export default {
  registerPlayer,
  getPlayerById
};
