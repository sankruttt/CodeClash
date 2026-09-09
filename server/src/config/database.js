import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;

export async function connectDatabase() {
  if (isConnected) return true;

  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is not configured');
    return false;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });

    isConnected = true;

    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    isConnected = false;
  }

  return isConnected;
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export default {
  connectDatabase,
  isMongoConnected
};