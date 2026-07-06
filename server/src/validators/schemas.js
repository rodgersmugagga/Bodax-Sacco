import { z } from 'zod';

const uuid = z.string({ required_error: 'ID is required' }).uuid('Invalid ID format');
const date = z.string({ required_error: 'Date is required' }).regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date format, e.g. YYYY-MM-DD');
const money = z.coerce.number({ required_error: 'Amount is required', invalid_type_error: 'Amount must be a number' }).positive('Amount must be greater than zero');

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(3, 'Identifier must be at least 3 characters').optional(),
    email: z.string().email('Enter a valid email address, e.g. user@example.com').optional(),
    password: z.string({ required_error: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
  }).refine((value) => value.identifier || value.email, {
    message: 'Phone number or email is required',
    path: ['identifier'],
  }),
});

export const memberSchema = z.object({
  body: z.object({
    member_number: z.string({ required_error: 'Member number is required' }).min(2, 'Enter a valid member number, e.g. M001'),
    full_name: z.string({ required_error: 'Full name is required' }).min(2, 'Enter a valid full name, e.g. John Doe'),
    phone_number: z.string({ required_error: 'Phone number is required' }).min(7, 'Enter a valid phone number, e.g. 0772123456'),
    email: z.string().email('Enter a valid email address, e.g. user@example.com').optional(),
    national_id: z.string().optional(),
    stage: z.string({ required_error: 'Stage is required' }).min(2, 'Enter a valid stage, e.g. Central Market'),
    next_of_kin: z.string().optional(),
    next_of_kin_phone: z.string().optional(),
    registration_date: date.optional(),
    status: z.enum(['active', 'inactive'], { errorMap: () => ({ message: "Status must be 'active' or 'inactive'" }) }).optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
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
    password: z.string({ required_error: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    current_password: z.string({ required_error: 'Current password is required' }).min(6, 'Password must be at least 6 characters'),
    new_password: z.string({ required_error: 'New password is required' }).min(6, 'Password must be at least 6 characters'),
  }),
});

export const signupSchema = z.object({
  body: z.object({
    member_number: z.string({ required_error: 'Member number is required' }).min(2, 'Enter a valid member number, e.g. M001'),
    full_name: z.string({ required_error: 'Full name is required' }).min(2, 'Enter a valid full name, e.g. John Doe'),
    phone_number: z.string({ required_error: 'Phone number is required' }).min(7, 'Enter a valid phone number, e.g. 0772123456'),
    email: z.string().email('Enter a valid email address, e.g. user@example.com').optional(),
    password: z.string({ required_error: 'Password is required' }).min(6, 'Password must be at least 6 characters'),
    stage: z.string({ required_error: 'Stage is required' }).min(2, 'Enter a valid stage, e.g. Central Market'),
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
    interest_rate: z.coerce.number().min(0, 'Interest rate cannot be negative').max(100, 'Interest rate cannot exceed 100%').optional(),
    installment_count: z.coerce.number().int().positive('Number of payments must be a positive whole number').optional(),
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
    action: z.enum(['approve', 'reject'], { errorMap: () => ({ message: "Action must be 'approve' or 'reject'" }) }),
    notes: z.string().optional(),
  }),
});

export const loanRequestSchema = z.object({
  body: z.object({
    member_id: uuid.optional(),
    requested_amount: money,
    purpose: z.string().optional(),
    installment_count: z.coerce.number().int().positive('Number of payments must be a positive whole number').optional(),
    due_date: date,
  }),
});

export const withdrawalRequestSchema = z.object({
  body: z.object({
    member_id: uuid.optional(),
    amount: money,
    reason: z.string().optional(),
  }),
});

export const withdrawalReviewSchema = z.object({
  params: z.object({ id: uuid }),
  body: z.object({
    action: z.enum(['approve', 'reject'], { errorMap: () => ({ message: "Action must be 'approve' or 'reject'" }) }),
  }),
});

export const statementSchema = z.object({
  query: z.object({
    member_id: uuid.optional(),
    from: date,
    to: date,
  }),
});
