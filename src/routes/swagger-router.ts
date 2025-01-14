import express, { NextFunction, Request, Response } from 'express'
import swaggerUi from "swagger-ui-express";
import { getSwaggerDocument } from '../utils/helpers.utils';
import { AppError } from '../utils/AppError';
const swaggerRouter = express.Router();

// Serve Swagger UI assets
swaggerRouter.use("/:projectName/swagger", swaggerUi.serve);

// Custom logic after Swagger UI setup
swaggerRouter.get("/:projectName/swagger", async (req: Request, res: Response, next: NextFunction): Promise<any> => {
    try {
        let { projectName } = req.params;
        projectName = projectName.toLowerCase();

        const docs = await getSwaggerDocument(projectName);
        swaggerUi.setup(docs)(req, res, next);
    } catch (err) {
        if (err instanceof AppError) {
            return res.status(err.statusCode).json({
                type: err.type,
                message: err.message,
            });
        }
        res.status(500).json({
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Something went wrong',
        });
    }
});

swaggerRouter.get("/:projectName/swagger/json", async (req: Request, res: Response): Promise<any> => {
    try {
        const { projectName } = req.params;
        const docs = await getSwaggerDocument(projectName);
        res.status(200).send(docs);
    } catch (err) {
        if (err instanceof AppError) {
            return res.status(err.statusCode).json({
                type: err.type,
                message: err.message,
            });
        }
        res.status(500).json({
            type: 'INTERNAL_SERVER_ERROR',
            message: 'Something went wrong',
        });
    }
});

// Add a catch-all middleware to return a 404 for invalid subpaths
swaggerRouter.use("/:projectName/swagger/*", (req: Request, res: Response) => {
    res.status(404).send("Not Found");
});


export default swaggerRouter;