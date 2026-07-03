import { Router } from 'express';
import * as controller from '../controllers/memberController.js';
import { authorize } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, memberCredentialsSchema, memberSchema, memberUpdateSchema, listMembersSchema } from '../validators/schemas.js';

const router = Router();

router.get('/', authorize('TREASURER', 'CHAIRMAN'), validate(listMembersSchema), controller.listMembers);
router.post('/', authorize('TREASURER'), validate(memberSchema), controller.createMember);
router.get('/:id', authorize('TREASURER', 'CHAIRMAN'), validate(idParamSchema), controller.getMember);
router.patch('/:id', authorize('TREASURER'), validate(memberUpdateSchema), controller.updateMember);
router.patch('/:id/credentials', authorize('TREASURER'), validate(memberCredentialsSchema), controller.setMemberCredentials);

export default router;
