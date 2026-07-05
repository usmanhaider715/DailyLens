import { Router } from 'express';
import { getAuthorBySlug, listAuthors } from '../controllers/authorController.js';

const router = Router();

router.get('/', listAuthors);
router.get('/:slug', getAuthorBySlug);

export default router;
