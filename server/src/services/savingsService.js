import { query } from '../config/db.js';
import { weekStart, monthStart, yearStart } from '../utils/dates.js';
import { AppError } from '../utils/AppError.js';

export async function recordSaving(payload, recordedBy) {
  // Verify member exists and is active before recording savings
  const memberResult = await query('SELECT id, status FROM members WHERE id = $1', [payload.member_id]);
  if (!memberResult.rows[0]) throw new AppError('Member not found', 404);
  if (memberResult.rows[0].status !== 'active') {
    throw new AppError('Cannot record savings for an inactive member', 400);
  }

  const { rows } = await query(
    `INSERT INTO savings_transactions (member_id, recorded_by, amount, transaction_date, notes, confirmed)
     VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6)
     RETURNING *`,
    [payload.member_id, recordedBy, payload.amount, payload.transaction_date || null, payload.notes || null, true],
  );

  return rows[0];
}

export async function memberSavingsSummary(memberId) {
  const today = new Date();
  const { rows } = await query(
    `SELECT
       COALESCE(SUM(amount), 0) AS total_savings,
       COALESCE(SUM(amount) FILTER (WHERE transaction_date >= $2), 0) AS week_savings,
       COALESCE(SUM(amount) FILTER (WHERE transaction_date >= $3), 0) AS month_savings,
       COALESCE(SUM(amount) FILTER (WHERE transaction_date >= $4), 0) AS year_savings
     FROM savings_transactions
     WHERE member_id = $1 AND confirmed = true`,
    [memberId, weekStart(today), monthStart(today), yearStart(today)],
  );
  return rows[0];
}

export async function memberRecentSavings(memberId, limit = 8) {
  const { rows } = await query(
    `SELECT id, amount, transaction_date, notes, created_at
     FROM savings_transactions
     WHERE member_id = $1 AND confirmed = true
     ORDER BY transaction_date DESC, created_at DESC
     LIMIT $2`,
    [memberId, limit],
  );
  return rows;
}

export async function collectionTotals(from, to) {
  const { rows } = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*)::int AS count
     FROM savings_transactions
     WHERE transaction_date BETWEEN $1 AND $2 AND confirmed = true`,
    [from, to],
  );
  return rows[0];
}

export async function statement(memberId, from, to) {
  const { rows } = await query(
    `SELECT 'saving' AS type, amount, transaction_date AS date, notes
     FROM savings_transactions WHERE member_id = $1 AND confirmed = true AND transaction_date BETWEEN $2 AND $3
     UNION ALL
     SELECT 'loan repayment' AS type, amount, payment_date AS date, notes
     FROM loan_repayments WHERE member_id = $1 AND payment_date BETWEEN $2 AND $3
     UNION ALL
     SELECT 'withdrawal' AS type, amount * -1 AS amount, withdrawal_date AS date, notes
     FROM withdrawals WHERE member_id = $1 AND withdrawal_date BETWEEN $2 AND $3
     ORDER BY date DESC`,
    [memberId, from, to],
  );
  return rows;
}
