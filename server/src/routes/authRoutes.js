import { Router } from 'express';
import { changePasswordController, loginController, meController, signupController } from '../controllers/authController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { changePasswordSchema, loginSchema, signupSchema } from '../validators/schemas.js';

const router = Router();

router.post('/login', validate(loginSchema), loginController);
router.post('/signup', validate(signupSchema), signupController);
router.get('/me', authenticate, meController);
router.patch('/password', authenticate, validate(changePasswordSchema), changePasswordController);

export default router;
