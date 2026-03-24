const { Router } = require('express');
const settingsController = require('../controllers/settingsController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { upsertSettingsSchema } = require('../validators/settingsValidator');

const router = Router();

router.use(auth);

router.get('/', settingsController.get);
router.put('/', validate(upsertSettingsSchema), settingsController.upsert);

module.exports = router;
