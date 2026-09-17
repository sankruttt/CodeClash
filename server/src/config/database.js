import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

let isConnected = false;
let connectionPromise = null;

// Configure Mongoose global options
mongoose.set('strictQuery', false);

// Connection event listeners
mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('✅ MongoDB connection established');
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('⚠️ MongoDB connection disconnected');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('🔄 MongoDB connection re-established');
});

export async function connectDatabase() {
  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  if (!MONGODB_URI) {
    const error = new Error('MONGODB_URI is not configured in environment variables');
    console.error('❌ Fatal:', error.message);
    throw error;
  }

  connectionPromise = (async () => {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000
      });

      isConnected = true;
      console.log('✅ MongoDB connected successfully to database');
      return true;
    } catch (error) {
      isConnected = false;
      connectionPromise = null;
      console.error('❌ Fatal: MongoDB connection failed:', error.message);
      throw error;
    }
  })();

  return connectionPromise;
}

export function isMongoConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export default {
  connectDatabase,
  isMongoConnected
};