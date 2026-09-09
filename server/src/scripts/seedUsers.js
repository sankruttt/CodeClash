// Seed script - creates test users
import dotenv from 'dotenv';
dotenv.config();

import { connectDatabase, isMongoConnected } from '../config/database.js';
import User from '../models/User.js';
import PlayerStatistics from '../models/PlayerStatistics.js';
import { inMemoryStore } from '../services/inMemoryStore.js';

const testUsers = [
  {
    username: 'alice',
    email: 'alice@codeclash.com',
    password: 'Alice123',
    avatar: 'AL',
    color: 'coral',
    rating: 2150,
    wins: 45,
    losses: 12,
    streak: 8
  },
  {
    username: 'bob',
    email: 'bob@codeclash.com',
    password: 'Bob12345',
    avatar: 'BO',
    color: 'blue',
    rating: 1980,
    wins: 32,
    losses: 18,
    streak: 3
  },
  {
    username: 'charlie',
    email: 'charlie@codeclash.com',
    password: 'Charlie123',
    avatar: 'CH',
    color: 'green',
    rating: 2350,
    wins: 67,
    losses: 8,
    streak: 12
  },
  {
    username: 'diana',
    email: 'diana@codeclash.com',
    password: 'Diana123',
    avatar: 'DI',
    color: 'gold',
    rating: 1820,
    wins: 24,
    losses: 21,
    streak: 0
  },
  {
    username: 'eve',
    email: 'eve@codeclash.com',
    password: 'Eve12345',
    avatar: 'EV',
    color: 'coral',
    rating: 2500,
    wins: 89,
    losses: 5,
    streak: 15
  },
  {
    username: 'frank',
    email: 'frank@codeclash.com',
    password: 'Frank123',
    avatar: 'FR',
    color: 'blue',
    rating: 1650,
    wins: 15,
    losses: 28,
    streak: -2
  },
  {
    username: 'grace',
    email: 'grace@codeclash.com',
    password: 'Grace123',
    avatar: 'GR',
    color: 'green',
    rating: 2100,
    wins: 38,
    losses: 14,
    streak: 5
  },
  {
    username: 'henry',
    email: 'henry@codeclash.com',
    password: 'Henry123',
    avatar: 'HE',
    color: 'gold',
    rating: 1920,
    wins: 29,
    losses: 19,
    streak: 2
  }
];

async function seedUsers() {
  console.log('🌱 Seeding test users...\n');
  
  await connectDatabase();
  
  if (isMongoConnected()) {
    console.log('📦 Using MongoDB');
    
    let created = 0;
    let skipped = 0;
    
    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existing = await User.findOne({
          $or: [{ email: userData.email }, { username: userData.username }]
        });
        
        if (existing) {
          console.log(`⏭️  Skipped: ${userData.username} (already exists)`);
          skipped++;
          continue;
        }
        
        // Use plain password - the middleware will hash it
        const user = await User.create(userData);
        console.log(`✅ Created: ${userData.username} (rating: ${userData.rating})`);
        created++;
        
        // Create statistics
        const stats = new PlayerStatistics({
          userId: user._id,
          username: user.username,
          totalMatches: userData.wins + userData.losses,
          totalWins: userData.wins,
          totalLosses: userData.losses,
          currentRating: userData.rating,
          peakRating: userData.rating,
          currentStreak: userData.streak,
          bestStreak: userData.streak,
          winRate: Math.round((userData.wins / (userData.wins + userData.losses)) * 100),
          globalRank: 0,
          seasonPoints: userData.wins * 10
        });
        await stats.save();
        
      } catch (error) {
        console.error(`❌ Error creating ${userData.username}:`, error.message);
      }
    }
    
    console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
    
    // Update global ranks
    const allStats = await PlayerStatistics.find().sort({ currentRating: -1 });
    for (let i = 0; i < allStats.length; i++) {
      allStats[i].globalRank = i + 1;
      await allStats[i].save();
    }
    console.log('✅ Global ranks updated');
    
  } else {
    console.log('💾 Using in-memory store');
    
    let created = 0;
    let skipped = 0;
    
    for (const userData of testUsers) {
      try {
        const existing = inMemoryStore.getUserByEmail(userData.email);
        if (existing) {
          console.log(`⏭️  Skipped: ${userData.username} (already exists)`);
          skipped++;
          continue;
        }
        
        // Hash password for in-memory store too
        const { user } = await inMemoryStore.createUser({
          username: userData.username,
          email: userData.email,
          password: userData.password,
          avatar: userData.avatar
        });
        
        // Set the user's stats (rating, wins, etc.)
        inMemoryStore.updateUser(user.id, {
          color: userData.color,
          rating: userData.rating,
          wins: userData.wins,
          losses: userData.losses,
          streak: userData.streak
        });
        
        // Update statistics
        inMemoryStore.updateStatistics(user.id, {
          currentRating: userData.rating,
          peakRating: userData.rating,
          totalWins: userData.wins,
          totalLosses: userData.losses,
          totalMatches: userData.wins + userData.losses,
          currentStreak: userData.streak,
          bestStreak: Math.max(0, userData.streak),
          winRate: Math.round((userData.wins / (userData.wins + userData.losses)) * 100)
        });
        
        console.log(`✅ Created: ${userData.username} (rating: ${userData.rating})`);
        created++;
      } catch (error) {
        console.error(`❌ Error creating ${userData.username}:`, error.message);
      }
    }
    
    console.log(`\n📊 Summary: ${created} created, ${skipped} skipped`);
  }
  
  console.log('\n✅ Seed completed!');
  process.exit(0);
}

seedUsers().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
