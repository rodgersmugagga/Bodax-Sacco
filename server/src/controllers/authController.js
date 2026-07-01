import { changePassword, login, register } from '../services/authService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const loginController = asyncHandler(async (req, res) => {
  const identifier = req.validated.body.identifier || req.validated.body.email;
  const result = await login(identifier, req.validated.body.password);
  res.json(result);
});

export const signupController = asyncHandler(async (req, res) => {
  const result = await register(req.validated.body);
  res.status(201).json(result);
});

export const meController = asyncHandler(async (req, res) => {
  const { password_hash, ...user } = req.user;
  res.json({ user });
});

export const changePasswordController = asyncHandler(async (req, res) => {
  await changePassword(req.user.id, req.validated.body.current_password, req.validated.body.new_password);
  res.json({ message: 'Password updated successfully' });
});
