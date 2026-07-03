import { z } from 'zod';

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.coerce.number().positive();

// String field limits matching DB VARCHAR column sizes
const shortStr = z.string().min(1).max(40);      // member_number, status codes
const nameStr = z.string().min(2).max(160);       // full_name
const phoneStr = z.string().min(7).max(30);       // phone_number
const idStr = z.string().max(80).optional();      // national_id
const stageStr = z.string().min(2).max(120);      // stage
const kinStr = z.string().max(160).optional();    // next_of_kin
const noteStr = z.string().max(500).optional();   // notes, purpose, reason
const passwordStr = z.string().min(6).max(128);   // password

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3).max(40).optional(),
    email: z.string().email().optional(),
    password: passwordStr,
  }).refine((value) => value.identifier || value.email, {
    message: 'Phone number or email is required',
    path: ['identifier'],
  }),
});

export const memberSchema = z.object({
  body: z.object({
    member_number: shortStr,
    full_name: nameStr,
    phone_number: phoneStr,
    email: z.string().email().max(255).optional(),
    national_id: idStr,
    stage: stageStr,
    next_of_kin: kinStr,
    next_of_kin_phone: z.string().max(30).optional(),
    registration_date: date.optional(),
    status: z.enum(['active', 'inactive']).optional(),
    password: passwordStr.optional(),
  }),
});

export const memberUpdateSchema = z.object({
  params: z.object({ id: uuid }),
  body: memberSchema.shape.body.partial(),
});

export const idParamSchema = z.object({ params: z.object({ id: uuid }) });

export const memberCredentialsSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    password: passwordStr,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    current_password: passwordStr,
    new_password: passwordStr,
  }),
});

export const signupSchema = z.object({
  body: z.object({
    member_number: shortStr,
    full_name: nameStr,
    phone_number: phoneStr,
    email: z.string().email().max(255).optional(),
    password: passwordStr,
    stage: stageStr,
    national_id: idStr,
    next_of_kin: kinStr,
    next_of_kin_phone: z.string().max(30).optional(),
  }),
});

export const savingSchema = z.object({
  body: z.object({
    member_id: uuid,
    amount: money,
    transaction_date: date.optional(),
    notes: noteStr,
    // confirmed is intentionally omitted; service always defaults to true
  }),
});

export const loanSchema = z.object({
  body: z.object({
    member_id: uuid,
    principal: money,
    interest_rate: z.coerce.number().min(0).max(100).optional(),
    installment_count: z.coerce.number().int().positive().optional(),
    issued_date: date.optional(),
    due_date: date,
    notes: noteStr,
  }),
});

export const repaymentSchema = z.object({
  body: z.object({
    loan_id: uuid,
    amount: money,
    payment_date: date.optional(),
    notes: noteStr,
  }),
});

export const loanReviewSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    action: z.enum(['approve', 'reject']),
    notes: noteStr,
  }),
});

export const loanRequestSchema = z.object({
  body: z.object({
    member_id: uuid.optional(),
    requested_amount: money,
    purpose: noteStr,
    installment_count: z.coerce.number().int().positive().optional(),
    due_date: date,
  }),
});

export const withdrawalRequestSchema = z.object({
  body: z.object({
    member_id: uuid,
    amount: money,
    reason: noteStr,
  }),
});

export const withdrawalReviewSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    action: z.enum(['approve', 'reject']),
  }),
});

export const statementSchema = z.object({
  query: z.object({
    member_id: uuid.optional(),
    from: date,
    to: date,
  }).refine((data) => !data.from || !data.to || data.from <= data.to, {
    message: '"from" date must be on or before "to" date',
    path: ['from'],
  }),
});

// ─── Query param schemas for GET endpoints previously missing validation ───

export const listWithdrawalRequestsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
  }),
});

export const checkEligibilitySchema = z.object({
  query: z.object({
    member_id: uuid.optional(),
    amount: z.coerce.number().positive().optional(),
  }),
});

export const listLoanRequestsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
    member_id: uuid.optional(),
  }),
});

export const listLoansSchema = z.object({
  query: z.object({
    status: z.enum(['active', 'completed', 'overdue']).optional(),
    member_id: uuid.optional(),
  }),
});

export const listMembersSchema = z.object({
  query: z.object({
    search: z.string().max(100).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
  }),
});
