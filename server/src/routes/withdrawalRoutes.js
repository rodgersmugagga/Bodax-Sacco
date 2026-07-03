import { Router } from 'express';
import * as controller from '../controllers/withdrawalController.js';
import { authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { withdrawalRequestSchema, withdrawalReviewSchema, listWithdrawalRequestsSchema } from '../validators/schemas.js';

const router = Router();

router.get('/requests', authorize('TREASURER', 'CHAIRMAN'), validate(listWithdrawalRequestsSchema), controller.listWithdrawalRequests);
router.post('/requests', authorize('MEMBER', 'TREASURER'), validate(withdrawalRequestSchema), controller.createWithdrawalRequest);
router.patch('/requests/:id/review', authorize('TREASURER'), validate(withdrawalReviewSchema), controller.reviewWithdrawalRequest);

export default router;
