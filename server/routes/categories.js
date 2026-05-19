import { Router } from 'express';
import * as cc from '../controllers/categoryController.js';

const router = Router();
router.get('/', cc.listCategories);
export default router;
