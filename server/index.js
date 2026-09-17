// Bootstrap forwarder to authoritative server entrypoint
// MongoDB is the single source of truth. All in-memory implementations have been removed.

export * from './src/index.js';
import app from './src/index.js';
export default app;
