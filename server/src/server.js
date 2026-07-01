import app from './app.js';
import { env } from './config/env.js';

// In local development, start the HTTP server normally.
// On Vercel, the app is exported as a serverless handler — no listen() needed.
if (!process.env.VERCEL) {
  app.listen(env.port, () => {
    console.log(`Bodax API running on port ${env.port}`);
  });
}

// Export for Vercel serverless runtime
export default app;
