import express from 'express';
import * as projectController from "../controllers/project-controller";

const router = express.Router();

// Define middlewares
const allMiddlewares = [
    projectController.validateProject,
    projectController.validateModule,
    projectController.validateResource,
    projectController.validateMethods,
    projectController.validatePayload,
    projectController.processRequest,
]

const paramsAllMiddlewares = [
    projectController.validateProject,
    projectController.validateModule,
    projectController.validateResource,
    projectController.validateMethods,
    projectController.validateParams,
    projectController.validatePayload,
    projectController.processRequest,
]


router.use('/:projectName/*/:id', paramsAllMiddlewares);
router.use('/:projectName/*', allMiddlewares);

export default router;
