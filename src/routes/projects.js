const { Router } = require('express');
const projectController = require('../controllers/projectController');
const wpFetchController = require('../controllers/wpFetchController');
const sheetController = require('../controllers/sheetController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createProjectSchema, updateProjectSchema } = require('../validators/projectValidator');

const router = Router();

router.use(auth);

router.post('/', validate(createProjectSchema), projectController.create);
router.get('/', projectController.list);
router.get('/:id', projectController.getById);
router.put('/:id', validate(updateProjectSchema), projectController.update);
router.delete('/:id', projectController.remove);

router.post('/:id/fetch-categories', wpFetchController.fetchCategories);
router.post('/:id/fetch-boards', wpFetchController.fetchBoards);

router.post('/:id/sync-sheet', sheetController.syncSheet);
router.get('/:id/recipes', sheetController.listRecipes);

module.exports = router;
