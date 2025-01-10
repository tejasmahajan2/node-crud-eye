import express from 'express';
import * as projectController from "../controllers/project-controller";

const router = express.Router();

// Define middlewares
router.use('/:projectName', projectController.validateProject);
router.use('/:projectName', projectController.validateType);
router.use('/:projectName', projectController.validateSchema);

module.exports = router;
