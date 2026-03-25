const { Router } = require('express');
const jobController = require('../controllers/jobController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createJobSchema } = require('../validators/jobValidator');

const router = Router();

router.use(auth);

router.post('/:projectId/jobs', validate(createJobSchema), jobController.create);
router.get('/:projectId/jobs', jobController.list);
router.get('/:projectId/jobs/:jobId', jobController.getById);
router.post('/:projectId/jobs/:jobId/retry', jobController.retry);
router.delete('/:projectId/jobs/:jobId', jobController.remove);

module.exports = router;
