import { Router } from 'express';
import * as controller from '../controllers/reportController.js';
import { authorize } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/dashboard/member', authorize('MEMBER'), controller.memberDashboard);
router.get('/dashboard/treasurer', authorize('TREASURER'), controller.treasurerDashboard);
router.get('/dashboard/chairman', authorize('CHAIRMAN'), controller.chairmanDashboard);
router.get('/analytics', authorize('CHAIRMAN', 'TREASURER'), controller.analytics);
router.get('/overdue-loans', authorize('TREASURER', 'CHAIRMAN'), controller.overdueLoans);

export default router;
