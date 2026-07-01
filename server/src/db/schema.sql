CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(30) UNIQUE NOT NULL,
  name VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID NOT NULL REFERENCES roles(id),
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  member_number VARCHAR(40) UNIQUE NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  phone_number VARCHAR(30) UNIQUE NOT NULL,
  national_id VARCHAR(80),
  stage VARCHAR(120) NOT NULL,
  next_of_kin VARCHAR(160),
  next_of_kin_phone VARCHAR(30),
  registration_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS savings_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  issued_by UUID NOT NULL REFERENCES users(id),
  principal NUMERIC(14, 2) NOT NULL CHECK (principal > 0),
  interest_rate NUMERIC(6, 3) NOT NULL DEFAULT 10 CHECK (interest_rate >= 0),
  interest_amount NUMERIC(14, 2) NOT NULL,
  total_payable NUMERIC(14, 2) NOT NULL,
  installment_count INTEGER NOT NULL DEFAULT 4 CHECK (installment_count > 0),
  installment_amount NUMERIC(14, 2) NOT NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  requested_amount NUMERIC(14, 2) NOT NULL CHECK (requested_amount > 0),
  purpose TEXT,
  installment_count INTEGER NOT NULL DEFAULT 4 CHECK (installment_count > 0),
  due_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  eligibility_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (eligibility_status IN ('eligible', 'ineligible')),
  eligibility_reason TEXT,
  max_eligible_amount NUMERIC(14, 2),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  reason TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID UNIQUE REFERENCES withdrawal_requests(id) ON DELETE SET NULL,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  recorded_by UUID NOT NULL REFERENCES users(id),
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  withdrawal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  generated_by UUID NOT NULL REFERENCES users(id),
  report_type VARCHAR(80) NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_members_member_number ON members(member_number);
CREATE INDEX IF NOT EXISTS idx_members_phone_number ON members(phone_number);
CREATE INDEX IF NOT EXISTS idx_savings_transaction_date ON savings_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_savings_member_date ON savings_transactions(member_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_member_status ON loans(member_id, status);
CREATE INDEX IF NOT EXISTS idx_repayments_payment_date ON loan_repayments(payment_date);
CREATE INDEX IF NOT EXISTS idx_loan_requests_status ON loan_requests(status);
CREATE INDEX IF NOT EXISTS idx_loan_requests_member ON loan_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);

INSERT INTO roles (code, name)
VALUES ('MEMBER', 'Member'), ('TREASURER', 'Treasurer'), ('CHAIRMAN', 'Chairman')
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (role_id, email, password_hash)
SELECT id, 'treasurer@bodax.test', crypt('password123', gen_salt('bf')) FROM roles WHERE code = 'TREASURER'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (role_id, email, password_hash)
SELECT id, 'chairman@bodax.test', crypt('password123', gen_salt('bf')) FROM roles WHERE code = 'CHAIRMAN'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (role_id, email, password_hash)
SELECT id, 'member@bodax.test', crypt('password123', gen_salt('bf')) FROM roles WHERE code = 'MEMBER'
ON CONFLICT (email) DO NOTHING;

INSERT INTO members (user_id, member_number, full_name, phone_number, national_id, stage, next_of_kin, next_of_kin_phone)
SELECT id, 'MBR-0001', 'John Kato', '+256700000001', 'CM000001', 'Mbarara Central Stage', 'Sarah Kato', '+256700000002'
FROM users WHERE email = 'member@bodax.test'
ON CONFLICT (member_number) DO NOTHING;
