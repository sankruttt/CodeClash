import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/codeclash';

let isConnected = false;

export async function connectDatabase() {
  if (isConnected) return;
  
  try {
    // Try connecting to MongoDB
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    console.log('✅ MongoDB connected:', MONGODB_URI);
  } catch (error) {
    console.log('⚠️  MongoDB not available, using in-memory storage');
    console.log('   To use MongoDB, install it locally or set MONGODB_URI in .env');
    isConnected = false;
  }
  
  return isConnected;
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export default { connectDatabase, isMongoConnected };
