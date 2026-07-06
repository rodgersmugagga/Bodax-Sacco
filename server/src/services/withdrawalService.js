import { query, transaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

async function memberSavingsBalance(memberId, runner = query) {
  const { rows } = await runner(
    `SELECT GREATEST(
       COALESCE((
         SELECT SUM(amount) FROM savings_transactions
         WHERE member_id = $1 AND confirmed = true
       ), 0) - COALESCE((
         SELECT SUM(amount) FROM withdrawals
         WHERE member_id = $1
       ), 0),
       0
     ) AS balance`,
    [memberId],
  );
  return Number(rows[0]?.balance || 0);
}

export async function createWithdrawalRequest(payload) {
  const balance = await memberSavingsBalance(payload.member_id);
  if (Number(payload.amount) > balance) {
    throw new AppError(`Withdrawal amount exceeds available savings balance (${balance.toLocaleString()} UGX)`, 400);
  }

  const { rows } = await query(
    `INSERT INTO withdrawal_requests (member_id, amount, reason)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [payload.member_id, payload.amount, payload.reason || null],
  );
  return rows[0];
}

export async function listWithdrawalRequests({ status, memberId } = {}) {
  const params = [];
  const filters = [];
  if (status) {
    params.push(status);
    filters.push(`wr.status = $${params.length}`);
  }
  if (memberId) {
    params.push(memberId);
    filters.push(`wr.member_id = $${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const { rows } = await query(
    `SELECT wr.*, m.full_name, m.member_number,
            GREATEST(
              COALESCE((
                SELECT SUM(s.amount) FROM savings_transactions s
                WHERE s.member_id = wr.member_id AND s.confirmed = true
              ), 0) - COALESCE((
                SELECT SUM(w.amount) FROM withdrawals w
                WHERE w.member_id = wr.member_id
              ), 0),
              0
            ) AS available_savings
     FROM withdrawal_requests wr
     JOIN members m ON m.id = wr.member_id
     ${where}
     ORDER BY wr.requested_at DESC`,
    params,
  );
  return rows;
}

export async function reviewWithdrawalRequest(id, action, reviewedBy) {
  return transaction(async (client) => {
    const found = await client.query('SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE', [id]);
    const request = found.rows[0];
    if (!request) throw new AppError('Withdrawal request not found', 404);
    if (request.status !== 'pending') throw new AppError('Request has already been reviewed', 409);

    const status = action === 'approve' ? 'approved' : 'rejected';
    if (status === 'approved') {
      const balance = await memberSavingsBalance(request.member_id, client.query.bind(client));
      if (Number(request.amount) > balance) {
        throw new AppError(`Withdrawal amount exceeds available savings balance (${balance.toLocaleString()} UGX)`, 400);
      }
    }

    const reviewed = await client.query(
      `UPDATE withdrawal_requests
       SET status = $2, reviewed_by = $3, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, reviewedBy],
    );

    let withdrawal = null;
    if (status === 'approved') {
      const created = await client.query(
        `INSERT INTO withdrawals (request_id, member_id, recorded_by, amount, notes)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING *`,
        [id, request.member_id, reviewedBy, request.amount, request.reason],
      );
      withdrawal = created.rows[0];
    }

    return { request: reviewed.rows[0], withdrawal };
  });
}