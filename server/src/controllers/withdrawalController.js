import * as withdrawalService from '../services/withdrawalService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const createWithdrawalRequest = asyncHandler(async (req, res) => {
  const payload =
    req.user.role_code === 'MEMBER'
      ? { ...req.validated.body, member_id: req.user.member_id }
      : req.validated.body;
  res.status(201).json(await withdrawalService.createWithdrawalRequest(payload));
});

export const listWithdrawalRequests = asyncHandler(async (req, res) => {
  const status = req.validated?.query?.status;
  res.json(await withdrawalService.listWithdrawalRequests(status));
});

export const reviewWithdrawalRequest = asyncHandler(async (req, res) => {
  res.json(
    await withdrawalService.reviewWithdrawalRequest(
      req.validated.params.id,
      req.validated.body.action,
      req.user.id,
    ),
  );
});
