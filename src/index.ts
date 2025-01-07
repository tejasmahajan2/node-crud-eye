import express, { Express, NextFunction, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/database";
import mongoose from "mongoose";
import { generateSwaggerPaths } from "./utils/helpers.utils";
import { error } from "console";
dotenv.config();

const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");


const app: Express = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
connectDB();

app.get("/", (req: Request, res: Response) => {
    res.send("Express + TypeScript Server");
});

app.use("/:projectName/swagger", swaggerUi.serve); // Serve Swagger UI assets

// Custom logic after Swagger UI setup
app.use("/:projectName/swagger", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { projectName } = req.params;

        const projectsCollection = mongoose.connection.collection("projects");

        const projectFound = await projectsCollection.findOne({ name: projectName });
        if (!projectFound) {
            res.status(404).json({ error: `Type not found for project: ${projectName}` });
            return;
        }


        const typesCollection = mongoose.connection.collection("types");
        const typeFound = await typesCollection.findOne({
            projectId: projectFound?.uuid,
            organizationId: projectFound?.organizationId,
        });

        if (!typeFound) {
            res.status(404).json({ error: `Type not found for project: ${projectName}` });
            return;
        }


        const swaggerPaths = generateSwaggerPaths(projectFound, typeFound);
        const docs = swaggerJsdoc({
            definition: {
                openapi: "3.1.0",
                info: {
                    title: `${projectName} API`,
                    version: "1.0.0",
                    description: `Swagger documentation for ${projectName}`,
                },
                basePath: `/${projectName}`,
                paths: swaggerPaths,
            },
            apis: ["./src/**/*.ts"], // Adjust to match your API file paths
        });

        swaggerUi.setup(docs)(req, res, next);
    } catch (error) {
        res.status(404).json({ error: `An expected error occurred.` });
    }
});

app.get("/:projectName/swagger/json", async (req: Request, res: Response) => {
    const { projectName } = req.params;

    const projectsCollection = mongoose.connection.collection("projects");

    const projectFound = await projectsCollection.findOne({ name: projectName });
    if (!projectFound) res.send({ error: "Project not found" });

    const typesCollection = mongoose.connection.collection("types");
    const typeFound = await typesCollection.findOne({
        projectId: projectFound?.uuid,
        organizationId: projectFound?.organizationId,
    });

    if (!typeFound) res.send({ error: "Type not found" });

    const swaggerPaths = generateSwaggerPaths(projectFound, typeFound);
    const docs = swaggerJsdoc({
        definition: {
            openapi: "3.1.0",
            info: {
                title: `${projectName} API`,
                version: "1.0.0",
                description: `Swagger documentation for ${projectName}`,
            },
            basePath: `/${projectName}`,
            paths: swaggerPaths,
        },
        apis: ["./src/**/*.ts"], // Adjust to match your API file paths
    });

    res.send(docs);
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});

