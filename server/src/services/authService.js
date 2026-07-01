import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { AppError } from '../utils/AppError.js';
import * as memberService from './memberService.js';

const userSelect = `
  SELECT u.id, u.email, u.password_hash, u.is_active, r.code AS role_code, r.name AS role_name,
         m.id AS member_id, m.full_name, m.member_number
  FROM users u
  JOIN roles r ON r.id = u.role_id
  LEFT JOIN members m ON m.user_id = u.id
`;

export async function getUserById(id) {
  const { rows } = await query(`${userSelect} WHERE u.id = $1`, [id]);
  return rows[0];
}

export async function login(identifier, password) {
  const value = identifier.trim();
  const { rows } = await query(
    `${userSelect}
     WHERE lower(u.email) = lower($1)
        OR m.phone_number = $1`,
    [value],
  );
  const user = rows[0];

  if (!user || !user.is_active) {
    throw new AppError('Invalid login details', 401);
  }

  const valid = user.password_hash.startsWith('$2')
    ? await bcrypt.compare(password, user.password_hash)
    : false;

  if (!valid) throw new AppError('Invalid login details', 401);

  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  const token = jwt.sign(
    { sub: user.id, role: user.role_code, memberId: user.member_id },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

  delete user.password_hash;
  return { token, user };
}

export async function register(payload) {
  await memberService.createMember(payload);
  const identifier = payload.email?.trim() || payload.phone_number.trim();
  return login(identifier, payload.password);
}

export async function changePassword(userId, currentPassword, newPassword) {
  const user = await getUserById(userId);
  if (!user) throw new AppError('User not found', 404);

  const valid = user.password_hash.startsWith('$2')
    ? await bcrypt.compare(currentPassword, user.password_hash)
    : false;

  if (!valid) throw new AppError('Current password is incorrect', 400);

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await query('UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1', [userId, passwordHash]);
}
