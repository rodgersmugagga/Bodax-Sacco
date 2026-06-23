import * as reportService from '../services/reportService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const treasurerDashboard = asyncHandler(async (_req, res) => {
  res.json(await reportService.treasurerDashboard());
});

export const chairmanDashboard = asyncHandler(async (_req, res) => {
  res.json(await reportService.chairmanDashboard());
});

export const memberDashboard = asyncHandler(async (req, res) => {
  // Fixed: use memberId (camelCase) instead of member_id (snake_case)
  const memberId = req.user.memberId || req.user.member_id;
  
  if (!memberId) {
    return res.status(400).json({ message: 'Member ID not found in user session' });
  }
  
  res.json(await reportService.memberDashboard(memberId));
});

export const analytics = asyncHandler(async (_req, res) => {
  const [topSavers, defaulters, trend, income, expenditure] = await Promise.all([
    reportService.topSavers(),
    reportService.defaulters(),
    reportService.collectionTrend(),
    reportService.incomeSummary(),
    reportService.expenditureSummary(),
  ]);

  res.json({ topSavers, defaulters, trend, income, expenditure });
});