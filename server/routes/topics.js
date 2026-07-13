import { Router } from 'express';
import { getTopic, listTopics } from '../controllers/topicController.js';

const router = Router();

router.get('/', listTopics);
router.get('/:slug', getTopic);

export default router;
