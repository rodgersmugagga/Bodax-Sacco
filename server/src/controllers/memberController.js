import * as memberService from '../services/memberService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listMembers = asyncHandler(async (req, res) => {
  res.json(await memberService.listMembers(req.validated?.query || req.query));
});

export const getMember = asyncHandler(async (req, res) => {
  res.json(await memberService.getMember(req.params.id));
});

export const createMember = asyncHandler(async (req, res) => {
  res.status(201).json(await memberService.createMember(req.validated.body));
});

export const updateMember = asyncHandler(async (req, res) => {
  res.json(await memberService.updateMember(req.validated.params.id, req.validated.body));
});

export const setMemberCredentials = asyncHandler(async (req, res) => {
  const user = await memberService.setMemberCredentials(req.validated.params.id, req.validated.body.password);
  res.json({ message: 'Member login credentials updated', user });
});
