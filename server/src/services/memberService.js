import bcrypt from 'bcryptjs';
import { transaction } from '../config/db.js';
import { query } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

function memberLoginEmail(phoneNumber) {
  const compactPhone = phoneNumber.replace(/\s+/g, '');
  return `${compactPhone}@members.bodax.local`;
}

export async function listMembers({ search = '', page = 1, limit = 20 }) {
  const offset = (Number(page) - 1) * Number(limit);
  const term = `%${search}%`;
  const { rows } = await query(
    `SELECT *, COUNT(*) OVER() AS total_count
     FROM members
     WHERE $1 = '%%'
        OR full_name ILIKE $1
        OR phone_number ILIKE $1
        OR member_number ILIKE $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [term, limit, offset],
  );

  return {
    data: rows.map(({ total_count, ...member }) => member),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(rows[0]?.total_count || 0),
    },
  };
}

export async function getMember(id) {
  const { rows } = await query('SELECT * FROM members WHERE id = $1', [id]);
  if (!rows[0]) throw new AppError('Member not found', 404);
  return rows[0];
}

export async function createMember(payload) {
  return transaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO members
        (member_number, full_name, phone_number, national_id, stage, next_of_kin, next_of_kin_phone, registration_date, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8, CURRENT_DATE),COALESCE($9, 'active'))
       RETURNING *`,
      [
        payload.member_number,
        payload.full_name,
        payload.phone_number,
        payload.national_id || null,
        payload.stage,
        payload.next_of_kin || null,
        payload.next_of_kin_phone || null,
        payload.registration_date || null,
        payload.status || 'active',
      ],
    );

    const member = rows[0];
    if (payload.password) {
      const user = await setMemberCredentials(member.id, payload.password, client, payload.email);
      return { ...member, user_id: user.id };
    }

    return member;
  });
}

export async function updateMember(id, payload) {
  await getMember(id);
  const { rows } = await query(
    `UPDATE members
     SET full_name = COALESCE($2, full_name),
         phone_number = COALESCE($3, phone_number),
         national_id = COALESCE($4, national_id),
         stage = COALESCE($5, stage),
         next_of_kin = COALESCE($6, next_of_kin),
         next_of_kin_phone = COALESCE($7, next_of_kin_phone),
         status = COALESCE($8, status),
         updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [
      id,
      payload.full_name,
      payload.phone_number,
      payload.national_id,
      payload.stage,
      payload.next_of_kin,
      payload.next_of_kin_phone,
      payload.status,
    ],
  );
  return rows[0];
}

export async function setMemberCredentials(memberId, password, db = query, email) {
  const runner = typeof db === 'function' ? { query: db } : db;
  const memberResult = await runner.query('SELECT * FROM members WHERE id = $1', [memberId]);
  const member = memberResult.rows[0];
  if (!member) throw new AppError('Member not found', 404);

  const roleResult = await runner.query('SELECT id FROM roles WHERE code = $1', ['MEMBER']);
  const role = roleResult.rows[0];
  if (!role) throw new AppError('Member role is not configured', 500);

  const passwordHash = await bcrypt.hash(password, 12);

  if (member.user_id) {
    const updated = await runner.query(
      `UPDATE users
       SET password_hash = $2, is_active = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, is_active`,
      [member.user_id, passwordHash],
    );
    return updated.rows[0];
  }

  const userEmail = email?.trim() || memberLoginEmail(member.phone_number);
  const created = await runner.query(
    `INSERT INTO users (role_id, email, password_hash, is_active)
     VALUES ($1, $2, $3, TRUE)
     RETURNING id, email, is_active`,
    [role.id, userEmail, passwordHash],
  );

  await runner.query('UPDATE members SET user_id = $2, updated_at = NOW() WHERE id = $1', [
    memberId,
    created.rows[0].id,
  ]);

  return created.rows[0];
}
