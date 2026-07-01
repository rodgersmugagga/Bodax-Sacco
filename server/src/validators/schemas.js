import { z } from 'zod';

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.coerce.number().positive();

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6),
  }).refine((value) => value.identifier || value.email, {
    message: 'Phone number or email is required',
    path: ['identifier'],
  }),
});

export const memberSchema = z.object({
  body: z.object({
    member_number: z.string().min(2),
    full_name: z.string().min(2),
    phone_number: z.string().min(7),
    email: z.string().email().optional(),
    national_id: z.string().optional(),
    stage: z.string().min(2),
    next_of_kin: z.string().optional(),
    next_of_kin_phone: z.string().optional(),
    registration_date: date.optional(),
    status: z.enum(['active', 'inactive']).optional(),
    password: z.string().min(6).optional(),
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
    password: z.string().min(6),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    current_password: z.string().min(6),
    new_password: z.string().min(6),
  }),
});

export const signupSchema = z.object({
  body: z.object({
    member_number: z.string().min(2),
    full_name: z.string().min(2),
    phone_number: z.string().min(7),
    email: z.string().email().optional(),
    password: z.string().min(6),
    stage: z.string().min(2),
    national_id: z.string().optional(),
    next_of_kin: z.string().optional(),
    next_of_kin_phone: z.string().optional(),
  }),
});

export const savingSchema = z.object({
  body: z.object({
    member_id: uuid,
    amount: money,
    transaction_date: date.optional(),
    notes: z.string().optional(),
    confirmed: z.boolean().optional(),
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
    notes: z.string().optional(),
  }),
});

export const repaymentSchema = z.object({
  body: z.object({
    loan_id: uuid,
    amount: money,
    payment_date: date.optional(),
    notes: z.string().optional(),
  }),
});

export const loanReviewSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    action: z.enum(['approve', 'reject']),
    notes: z.string().optional(),
  }),
});

export const loanRequestSchema = z.object({
  body: z.object({
    member_id: uuid.optional(),
    requested_amount: money,
    purpose: z.string().optional(),
    installment_count: z.coerce.number().int().positive().optional(),
    due_date: date,
  }),
});

export const withdrawalRequestSchema = z.object({
  body: z.object({
    member_id: uuid,
    amount: money,
    reason: z.string().optional(),
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
  }),
});
