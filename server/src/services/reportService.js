import { query } from '../config/db.js';
import { monthStart, weekStart } from '../utils/dates.js';
import { refreshOverdueLoans } from './loanService.js';

export async function treasurerDashboard() {
  await refreshOverdueLoans();
  const today = new Date();
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM members WHERE status = 'active') AS active_members,
       (SELECT COALESCE(SUM(amount), 0) FROM savings_transactions WHERE transaction_date = CURRENT_DATE AND confirmed = true) AS daily_collections,
       (SELECT COALESCE(SUM(amount), 0) FROM savings_transactions WHERE transaction_date >= $1 AND confirmed = true) AS weekly_collections,
       (SELECT COALESCE(SUM(amount), 0) FROM savings_transactions WHERE transaction_date >= $2 AND confirmed = true) AS monthly_collections,
       (SELECT COUNT(*)::int FROM withdrawal_requests WHERE status = 'pending') AS pending_withdrawals,
       (SELECT COUNT(*)::int FROM loan_requests WHERE status = 'pending') AS pending_loan_requests,
       (SELECT COUNT(*)::int FROM loans WHERE status = 'active') AS active_loans`,
    [weekStart(today), monthStart(today)],
  );
  return rows[0];
}

export async function chairmanDashboard() {
  await refreshOverdueLoans();
  const today = new Date();
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM members) AS members,
       (SELECT GREATEST(COALESCE((SELECT SUM(amount) FROM savings_transactions WHERE confirmed = true), 0) - COALESCE((SELECT SUM(amount) FROM withdrawals), 0), 0)) AS total_savings,
       (SELECT COUNT(*)::int FROM loans WHERE status = 'active') AS active_loans,
       (SELECT COALESCE(SUM(balance), 0)
        FROM (
          SELECT GREATEST(l.total_payable - COALESCE(SUM(r.amount), 0), 0) AS balance
          FROM loans l LEFT JOIN loan_repayments r ON r.loan_id = l.id
          WHERE l.status IN ('active','overdue')
          GROUP BY l.id
        ) loan_balances) AS outstanding_loan_balance,
       (SELECT COALESCE(SUM(balance), 0)
        FROM (
          SELECT GREATEST(l.total_payable - COALESCE(SUM(r.amount), 0), 0) AS balance
          FROM loans l LEFT JOIN loan_repayments r ON r.loan_id = l.id
          WHERE l.status = 'overdue' OR (l.status = 'active' AND l.due_date < CURRENT_DATE)
          GROUP BY l.id
        ) arrears) AS loan_arrears,
       (SELECT COALESCE(SUM(amount), 0) FROM savings_transactions WHERE transaction_date >= $1 AND confirmed = true) AS weekly_collections,
       (SELECT COALESCE(SUM(amount), 0) FROM savings_transactions WHERE transaction_date >= $2 AND confirmed = true) AS monthly_collections`,
    [weekStart(today), monthStart(today)],
  );
  return rows[0];
}

export async function memberDashboard(memberId) {
  await refreshOverdueLoans();

  const today = new Date();
  const { rows } = await query(
    `WITH member_loans AS (
      SELECT 
        l.id,
        l.principal,
        l.installment_amount,
        l.due_date,
        l.status,
        GREATEST(l.total_payable - COALESCE((SELECT SUM(amount) FROM loan_repayments r WHERE r.loan_id = l.id), 0), 0) AS remaining_balance
      FROM loans l
      WHERE l.member_id = $1
    )
    SELECT
       (SELECT GREATEST(COALESCE((SELECT SUM(amount) FROM savings_transactions WHERE member_id = $1 AND confirmed = true), 0) - COALESCE((SELECT SUM(amount) FROM withdrawals WHERE member_id = $1), 0), 0)) AS total_savings,
       (SELECT COALESCE(SUM(amount), 0) FROM savings_transactions WHERE member_id = $1 AND transaction_date >= $2 AND confirmed = true) AS week_savings,
       (SELECT COALESCE(SUM(amount), 0) FROM savings_transactions WHERE member_id = $1 AND transaction_date >= $3 AND confirmed = true) AS month_savings,
       (SELECT COALESCE(SUM(remaining_balance), 0) FROM member_loans WHERE status IN ('active', 'overdue')) AS active_loan_balance,
       (SELECT COALESCE(SUM(amount), 0) FROM loan_repayments WHERE member_id = $1 AND payment_date >= $2) AS paid_this_week,
       (SELECT amount FROM savings_transactions WHERE member_id = $1 AND confirmed = true ORDER BY created_at DESC LIMIT 1) AS latest_savings_amount,
       (SELECT transaction_date FROM savings_transactions WHERE member_id = $1 AND confirmed = true ORDER BY created_at DESC LIMIT 1) AS latest_savings_date,
       (SELECT json_agg(json_build_object(
          'id', id,
          'principal', principal,
          'remaining_balance', remaining_balance,
          'installment_amount', installment_amount,
          'due_date', due_date,
          'status', status
        )) FROM member_loans WHERE status IN ('active', 'overdue')) AS pending_loans,
       (SELECT json_agg(json_build_object(
          'id', id,
          'due_date', due_date,
          'remaining_balance', remaining_balance,
          'text', CASE WHEN status = 'overdue' THEN 'Loan overdue' ELSE 'Loan due soon' END,
          'status', status
        )) FROM member_loans WHERE status = 'overdue' OR (status = 'active' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days')) AS loan_reminders,
       (SELECT json_agg(json_build_object(
          'id', lr.id,
          'requested_amount', lr.requested_amount,
          'purpose', lr.purpose,
          'due_date', lr.due_date,
          'status', lr.status,
          'eligibility_status', lr.eligibility_status,
          'eligibility_reason', lr.eligibility_reason,
          'requested_at', lr.requested_at
        ) ORDER BY lr.requested_at DESC)
        FROM loan_requests lr WHERE lr.member_id = $1) AS loan_requests`,
    [memberId, weekStart(today), monthStart(today)],
  );
  const result = rows[0] || {};
  return {
    total_savings: Number(result.total_savings || 0),
    week_savings: Number(result.week_savings || 0),
    month_savings: Number(result.month_savings || 0),
    active_loan_balance: Number(result.active_loan_balance || 0),
    paid_this_week: Number(result.paid_this_week || 0),
    latest_savings_notification: result.latest_savings_amount
      ? { amount: Number(result.latest_savings_amount), transaction_date: result.latest_savings_date }
      : null,
    pending_loans: result.pending_loans || [],
    loan_reminders: result.loan_reminders || [],
    loan_requests: result.loan_requests || [],
  };
}

export async function topSavers() {
  const { rows } = await query(
    `SELECT m.full_name, m.member_number,
            GREATEST(
              COALESCE((
                SELECT SUM(s.amount) FROM savings_transactions s
                WHERE s.member_id = m.id AND s.confirmed = true
              ), 0) - COALESCE((
                SELECT SUM(w.amount) FROM withdrawals w
                WHERE w.member_id = m.id
              ), 0),
              0
            ) AS total
     FROM members m
     ORDER BY total DESC
     LIMIT 10`,
  );
  return rows;
}

export async function defaulters() {
  await refreshOverdueLoans();
  const { rows } = await query(
    `SELECT m.full_name, m.member_number, l.due_date,
            CURRENT_DATE - l.due_date::date AS days_overdue,
            GREATEST(l.total_payable - COALESCE(SUM(r.amount), 0), 0) AS balance
     FROM loans l
     JOIN members m ON m.id = l.member_id
     LEFT JOIN loan_repayments r ON r.loan_id = l.id
     WHERE l.status = 'overdue' OR (l.status = 'active' AND l.due_date < CURRENT_DATE)
     GROUP BY l.id, m.full_name, m.member_number, l.due_date
     HAVING GREATEST(l.total_payable - COALESCE(SUM(r.amount), 0), 0) > 0
     ORDER BY days_overdue DESC`,
  );
  return rows;
}

export async function collectionTrend(months = 6) {
  const { rows } = await query(
    `SELECT to_char(date_trunc('month', transaction_date), 'Mon YYYY') AS period,
            COALESCE(SUM(amount), 0) AS savings
     FROM savings_transactions
     WHERE transaction_date >= date_trunc('month', CURRENT_DATE) - (($1::int - 1) * interval '1 month') AND confirmed = true
     GROUP BY date_trunc('month', transaction_date)
     ORDER BY date_trunc('month', transaction_date)`,
    [months],
  );
  return rows;
}

export async function incomeSummary() {
  const { rows } = await query(
    `SELECT
       (SELECT COALESCE(SUM(amount), 0) FROM savings_transactions WHERE confirmed = true) AS savings_collected,
       (SELECT COALESCE(SUM(amount), 0) FROM loan_repayments) AS loan_repayments,
       (SELECT COALESCE(SUM(interest_amount), 0) FROM loans) AS interest_income`,
  );
  return rows[0];
}

export async function expenditureSummary() {
  const { rows } = await query(
    `SELECT COALESCE(SUM(amount), 0) AS withdrawals_paid, COUNT(*)::int AS withdrawal_count
     FROM withdrawals`,
  );
  return rows[0];
}

export async function overdueLoans() {
  await refreshOverdueLoans();
  const { rows } = await query(
    `SELECT
       m.full_name,
       m.member_number,
       l.due_date,
       CURRENT_DATE - l.due_date::date AS days_overdue,
       GREATEST(l.total_payable - COALESCE(SUM(r.amount), 0), 0) AS amount_overdue
     FROM loans l
     JOIN members m ON m.id = l.member_id
     LEFT JOIN loan_repayments r ON r.loan_id = l.id
     WHERE l.status = 'overdue' OR (l.status = 'active' AND l.due_date < CURRENT_DATE)
     GROUP BY l.id, m.full_name, m.member_number, l.due_date
     HAVING GREATEST(l.total_payable - COALESCE(SUM(r.amount), 0), 0) > 0
     ORDER BY days_overdue DESC`,
  );
  return rows;
}
