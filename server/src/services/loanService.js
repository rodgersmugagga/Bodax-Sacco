import { query, transaction } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

const LOAN_SAVINGS_MULTIPLIER = 3;

function calculateLoan({ principal, interest_rate = 10, installment_count = 4 }) {
  const interestAmount = Number(principal) * (Number(interest_rate) / 100);
  const totalPayable = Number(principal) + interestAmount;
  return {
    interest_amount: interestAmount,
    total_payable: totalPayable,
    installment_amount: totalPayable / Number(installment_count),
  };
}

export async function refreshOverdueLoans() {
  await query(
    `UPDATE loans l SET status = 'overdue', updated_at = NOW()
     WHERE l.status = 'active'
       AND l.due_date < CURRENT_DATE
       AND l.total_payable > COALESCE(
         (SELECT SUM(amount) FROM loan_repayments r WHERE r.loan_id = l.id), 0
       )`,
  );
}

export async function checkLoanEligibility(memberId, requestedAmount = null) {
  const memberResult = await query('SELECT status FROM members WHERE id = $1', [memberId]);
  const member = memberResult.rows[0];
  if (!member) throw new AppError('Member not found', 404);

  const savingsResult = await query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM savings_transactions
     WHERE member_id = $1 AND confirmed = true`,
    [memberId],
  );
  const totalSavings = Number(savingsResult.rows[0].total);
  const maxEligible = totalSavings * LOAN_SAVINGS_MULTIPLIER;

  if (member.status !== 'active') {
    return {
      eligible: false,
      reason: 'Your member account is not active',
      max_eligible_amount: maxEligible,
      total_savings: totalSavings,
      savings_multiplier: LOAN_SAVINGS_MULTIPLIER,
    };
  }

  const activeLoans = await listLoans({ memberId });
  const hasActiveLoan = activeLoans.some((loan) => ['active', 'overdue'].includes(loan.status));
  if (hasActiveLoan) {
    return {
      eligible: false,
      reason: 'You already have an active or overdue loan',
      max_eligible_amount: maxEligible,
      total_savings: totalSavings,
      savings_multiplier: LOAN_SAVINGS_MULTIPLIER,
    };
  }

  const pendingRequest = await query(
    `SELECT id FROM loan_requests WHERE member_id = $1 AND status = 'pending'`,
    [memberId],
  );
  if (pendingRequest.rows.length) {
    return {
      eligible: false,
      reason: 'You already have a pending loan request',
      max_eligible_amount: maxEligible,
      total_savings: totalSavings,
      savings_multiplier: LOAN_SAVINGS_MULTIPLIER,
    };
  }

  if (totalSavings <= 0) {
    return {
      eligible: false,
      reason: 'You need confirmed savings before applying for a loan',
      max_eligible_amount: 0,
      total_savings: totalSavings,
      savings_multiplier: LOAN_SAVINGS_MULTIPLIER,
    };
  }

  if (requestedAmount !== null && Number(requestedAmount) > maxEligible) {
    return {
      eligible: false,
      reason: `Requested amount exceeds your maximum eligible amount (${maxEligible.toLocaleString()} UGX — ${LOAN_SAVINGS_MULTIPLIER}× your savings)`,
      max_eligible_amount: maxEligible,
      total_savings: totalSavings,
      savings_multiplier: LOAN_SAVINGS_MULTIPLIER,
    };
  }

  return {
    eligible: true,
    reason: `Eligible to borrow up to ${maxEligible.toLocaleString()} UGX (${LOAN_SAVINGS_MULTIPLIER}× your savings)`,
    max_eligible_amount: maxEligible,
    total_savings: totalSavings,
    savings_multiplier: LOAN_SAVINGS_MULTIPLIER,
  };
}

export async function createLoanRequest(payload) {
  const eligibility = await checkLoanEligibility(payload.member_id, payload.requested_amount);
  const { rows } = await query(
    `INSERT INTO loan_requests
      (member_id, requested_amount, purpose, installment_count, due_date,
       eligibility_status, eligibility_reason, max_eligible_amount)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      payload.member_id,
      payload.requested_amount,
      payload.purpose || null,
      payload.installment_count ?? 4,
      payload.due_date,
      eligibility.eligible ? 'eligible' : 'ineligible',
      eligibility.reason,
      eligibility.max_eligible_amount,
    ],
  );
  return { request: rows[0], eligibility };
}

export async function listLoanRequests({ status, memberId } = {}) {
  const params = [];
  const filters = [];
  if (status) {
    params.push(status);
    filters.push(`lr.status = $${params.length}`);
  }
  if (memberId) {
    params.push(memberId);
    filters.push(`lr.member_id = $${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT lr.*, m.full_name, m.member_number
     FROM loan_requests lr
     JOIN members m ON m.id = lr.member_id
     ${where}
     ORDER BY lr.requested_at DESC`,
    params,
  );
  return rows;
}

export async function reviewLoanRequest(id, action, reviewedBy, notes = null) {
  return transaction(async (client) => {
    const found = await client.query('SELECT * FROM loan_requests WHERE id = $1 FOR UPDATE', [id]);
    const request = found.rows[0];
    if (!request) throw new AppError('Loan request not found', 404);
    if (request.status !== 'pending') throw new AppError('Request has already been reviewed', 409);

    if (action === 'approve') {
      if (request.eligibility_status !== 'eligible') {
        throw new AppError('Cannot approve an ineligible loan request', 400);
      }

      const eligibility = await checkLoanEligibility(request.member_id, request.requested_amount);
      if (!eligibility.eligible) {
        throw new AppError(eligibility.reason, 400);
      }

      const calculated = calculateLoan({
        principal: request.requested_amount,
        installment_count: request.installment_count,
      });

      const loanResult = await client.query(
        `INSERT INTO loans
          (member_id, issued_by, principal, interest_rate, interest_amount, total_payable,
           installment_count, installment_amount, due_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          request.member_id,
          reviewedBy,
          request.requested_amount,
          10,
          calculated.interest_amount,
          calculated.total_payable,
          request.installment_count,
          calculated.installment_amount,
          request.due_date,
          notes || request.purpose || null,
        ],
      );
      const loan = loanResult.rows[0];

      const reviewed = await client.query(
        `UPDATE loan_requests
         SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(),
             loan_id = $3, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, reviewedBy, loan.id],
      );

      return { request: reviewed.rows[0], loan };
    }

    const reviewed = await client.query(
      `UPDATE loan_requests
       SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, reviewedBy],
    );
    return { request: reviewed.rows[0], loan: null };
  });
}

export async function issueLoan(payload, issuedBy) {
  const eligibility = await checkLoanEligibility(payload.member_id, payload.principal);
  if (!eligibility.eligible) {
    throw new AppError(eligibility.reason, 400);
  }

  const calculated = calculateLoan(payload);
  const { rows } = await query(
    `INSERT INTO loans
      (member_id, issued_by, principal, interest_rate, interest_amount, total_payable,
       installment_count, installment_amount, issued_date, due_date, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9, CURRENT_DATE),$10,$11)
     RETURNING *`,
    [
      payload.member_id,
      issuedBy,
      payload.principal,
      payload.interest_rate ?? 10,
      calculated.interest_amount,
      calculated.total_payable,
      payload.installment_count ?? 4,
      calculated.installment_amount,
      payload.issued_date || null,
      payload.due_date,
      payload.notes || null,
    ],
  );
  return rows[0];
}

export async function refreshLoanStatus(client, loanId) {
  const { rows } = await client.query(
    `SELECT l.id, l.total_payable, l.due_date, l.status,
            COALESCE(SUM(r.amount), 0) AS paid
     FROM loans l
     LEFT JOIN loan_repayments r ON r.loan_id = l.id
     WHERE l.id = $1
     GROUP BY l.id`,
    [loanId],
  );
  const loan = rows[0];
  if (!loan) throw new AppError('Loan not found', 404);

  const balance = Number(loan.total_payable) - Number(loan.paid);
  const status = balance <= 0 ? 'completed' : new Date(loan.due_date) < new Date() ? 'overdue' : 'active';

  await client.query('UPDATE loans SET status = $2, updated_at = NOW() WHERE id = $1', [loanId, status]);
  return { ...loan, remaining_balance: Math.max(balance, 0), status };
}

export async function recordRepayment(payload, recordedBy) {
  return transaction(async (client) => {
    const loanResult = await client.query('SELECT * FROM loans WHERE id = $1', [payload.loan_id]);
    const loan = loanResult.rows[0];
    if (!loan) throw new AppError('Loan not found', 404);

    const repayment = await client.query(
      `INSERT INTO loan_repayments (loan_id, member_id, recorded_by, amount, payment_date, notes)
       VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6)
       RETURNING *`,
      [payload.loan_id, loan.member_id, recordedBy, payload.amount, payload.payment_date || null, payload.notes || null],
    );

    const summary = await refreshLoanStatus(client, payload.loan_id);
    return { repayment: repayment.rows[0], loan: summary };
  });
}

export async function listLoans({ memberId, status } = {}) {
  await refreshOverdueLoans();

  const params = [];
  const filters = [];
  if (memberId) {
    params.push(memberId);
    filters.push(`l.member_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    filters.push(`l.status = $${params.length}`);
  }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT l.*, m.full_name, m.member_number,
            COALESCE(SUM(r.amount), 0) AS amount_paid,
            GREATEST(l.total_payable - COALESCE(SUM(r.amount), 0), 0) AS remaining_balance
     FROM loans l
     JOIN members m ON m.id = l.member_id
     LEFT JOIN loan_repayments r ON r.loan_id = l.id
     ${where}
     GROUP BY l.id, m.full_name, m.member_number
     ORDER BY l.created_at DESC`,
    params,
  );
  return rows;
}

export async function memberActiveLoan(memberId) {
  const loans = await listLoans({ memberId });
  return loans.find((loan) => ['active', 'overdue'].includes(loan.status)) || null;
}
