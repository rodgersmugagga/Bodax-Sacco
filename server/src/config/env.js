import fs from 'fs';
import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDir = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(currentDir, '../..');
const serverEnvPath = resolve(serverRoot, '.env');
const workspaceEnvPath = resolve(serverRoot, '..', '.env');

const envPath = fs.existsSync(serverEnvPath)
  ? serverEnvPath
  : fs.existsSync(workspaceEnvPath)
  ? workspaceEnvPath
  : serverEnvPath;

dotenv.config({ path: envPath });

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

if (!env.databaseUrl && env.nodeEnv === 'production') {
  throw new Error('DATABASE_URL is required in production');
}

if (!process.env.JWT_SECRET && env.nodeEnv === 'production') {
  throw new Error('JWT_SECRET is required in production');
}
