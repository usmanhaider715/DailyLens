import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({ ok: true, message: 'Use /api/admin/analytics' });
});

export default router;
