const { Router } = require('express');
const authRoutes = require('./auth');
const projectRoutes = require('./projects');
const jobRoutes = require('./jobs');

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/projects', jobRoutes);

module.exports = router;
