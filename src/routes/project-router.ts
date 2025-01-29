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
    projectController.performPreBusinessLogic,
    projectController.processRequest,
    projectController.performPostBusinessLogic,
]

const paramsAllMiddlewares = [
    projectController.validateProject,
    projectController.validateModule,
    projectController.validateResource,
    projectController.validateMethods,
    projectController.validateParams,
    projectController.validatePayload,
    projectController.performPreBusinessLogic,
    projectController.processRequest,
    projectController.performPostBusinessLogic,
]


router.use('/:projectName/*/:id', paramsAllMiddlewares);
router.use('/:projectName/*', allMiddlewares);

export default router;
