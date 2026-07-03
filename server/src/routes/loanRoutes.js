import { Router } from 'express';
import * as controller from '../controllers/loanController.js';
import { authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { loanRequestSchema, loanReviewSchema, loanSchema, repaymentSchema,
  checkEligibilitySchema, listLoanRequestsSchema, listLoansSchema } from '../validators/schemas.js';

const router = Router();

router.get('/eligibility', authorize('MEMBER', 'TREASURER', 'CHAIRMAN'), validate(checkEligibilitySchema), controller.checkEligibility);
router.get('/requests', authorize('MEMBER', 'TREASURER', 'CHAIRMAN'), validate(listLoanRequestsSchema), controller.listLoanRequests);
router.post('/requests', authorize('MEMBER', 'TREASURER'), validate(loanRequestSchema), controller.createLoanRequest);
router.patch('/requests/:id/review', authorize('TREASURER'), validate(loanReviewSchema), controller.reviewLoanRequest);
router.get('/', authorize('MEMBER', 'TREASURER', 'CHAIRMAN'), validate(listLoansSchema), controller.listLoans);
router.post('/', authorize('TREASURER'), validate(loanSchema), controller.issueLoan);
router.post('/repayments', authorize('TREASURER'), validate(repaymentSchema), controller.recordRepayment);

export default router;
