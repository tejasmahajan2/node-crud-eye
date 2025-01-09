import dotenv from "dotenv";
dotenv.config({});

import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/database";
import { getSwaggerDocument } from "./utils/helpers.utils";
import swaggerUi from "swagger-ui-express";

const app: Express = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
connectDB();

app.get("/", (req: Request, res: Response) => {
    res.send("Express + TypeScript Server");
});

// Serve Swagger UI assets
app.use("/:projectName/swagger", swaggerUi.serve);

// Custom logic after Swagger UI setup
app.get("/:projectName/swagger", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { projectName } = req.params;
        const docs = await getSwaggerDocument(projectName);
        swaggerUi.setup(docs)(req, res, next);
    } catch (error) {
        res.status(404).json({ error: `An expected error occurred.` });
    }
});

app.get("/:projectName/swagger/json", async (req: Request, res: Response) => {
    try {
        const { projectName } = req.params;
        const docs = await getSwaggerDocument(projectName);
        res.status(200).send(docs);
    } catch (error) {
        res.status(404).json({ error: `An expected error occurred.` });
    }
});

// Add a catch-all middleware to return a 404 for invalid subpaths
app.use("/:projectName/swagger/*", (req: Request, res: Response) => {
    res.status(404).send("Not Found");
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});

