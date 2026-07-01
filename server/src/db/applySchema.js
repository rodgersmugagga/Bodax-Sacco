import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(currentDir, 'schema.sql');
const expectedTables = [
  'roles',
  'users',
  'members',
  'savings_transactions',
  'loans',
  'loan_repayments',
  'loan_requests',
  'withdrawal_requests',
  'withdrawals',
  'reports',
];

try {
  const sql = await readFile(schemaPath, 'utf8');
  await pool.query(sql);

  const tables = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
       AND table_name = ANY($1)
     ORDER BY table_name`,
    [expectedTables],
  );
  const users = await pool.query('SELECT COUNT(*)::int AS count FROM users');

  console.log(
    JSON.stringify({
      schemaApplied: true,
      expectedTables: tables.rows.length,
      users: users.rows[0].count,
    }),
  );
} finally {
  await pool.end();
}
