const { Router } = require('express');
const authRoutes = require('./auth');
const projectRoutes = require('./projects');
const jobRoutes = require('./jobs');
const settingsRoutes = require('./settings');
const dashboardRoutes = require('./dashboard');
const imageProxyRoutes = require('./imageProxy');
const templateRoutes = require('./templateRoutes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/projects', projectRoutes);
router.use('/projects', jobRoutes);
router.use('/settings', settingsRoutes);
router.use('/image-proxy', imageProxyRoutes);
router.use('/templates', templateRoutes);

module.exports = router;
