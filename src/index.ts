import dotenv from "dotenv";
dotenv.config({});

import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/database";
import { getSwaggerDocument } from "./utils/helpers.utils";
import swaggerUi from "swagger-ui-express";
import mongoose from "mongoose";
import Ajv from "ajv";
import addFormats from "ajv-formats";
const ajv = new Ajv();
addFormats(ajv);

const app: Express = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
connectDB();

const projectsCollection = mongoose.connection.collection("projects");
const typesCollection = mongoose.connection.collection("types");
const schemaEntitiesCollection = mongoose.connection.collection("schemaentities");
const bussinessLogicsCollection = mongoose.connection.collection("bussinesslogics");

app.get("/", (req: Request, res: Response) => {
    res.send("Express + TypeScript Server");
});

async function validateRequest(req: Request, res: Response, next: NextFunction) {
    const { projectName } = req.params;
    const projectFound = await projectsCollection.findOne({
        name: projectName,
        isDeleted: false
    });

    if (!projectFound) {
        res.status(404).send(`Cannot ${req.method} /${projectName}`);
    } else {
        const typeFound = await typesCollection.findOne({
            projectId: projectFound?.uuid,
            organizationId: projectFound?.organizationId,
            isDeleted: false
        });

        if (!typeFound) {
            res.status(404).send(`Cannot ${req.method} /${projectName}`);
        } else {
            const resource = req.originalUrl.split(`/${projectName}/`)[1];
            const schemaEntity = await schemaEntitiesCollection.findOne({
                method: req.method.toLocaleLowerCase(),
                resource,
                uuid: typeFound?.schemaId,
                isDeleted: false,
            });

            if (!schemaEntity) {
                res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
            } else {
                const validate = ajv.compile(schemaEntity.schema);
                if (!validate(req.body)) {
                    res.status(400).json({ errors: validate.errors });
                } else {

                    // Check if the collection exists
                    // Create a generic schema
                    const collectionName = `${projectName}_${resource}`.toLocaleLowerCase();

                    let DynamicModel = mongoose.models[collectionName];
                    if (!DynamicModel) {
                        const dynamicSchema = new mongoose.Schema({}, { strict: false });
                        DynamicModel = mongoose.model(collectionName, dynamicSchema, collectionName);
                    }

                    switch (req?.method) {
                        case "GET":
                            res.send(await DynamicModel.findById(req.body));
                            break;
                        case "POST":
                            res.send(await DynamicModel.create(req.body));
                            break;
                        default:
                            break;
                    }

                    // // // Create a model for the dynamic collection
                    // const dynamicSchema = new mongoose.Schema({}, { strict: false });
                    // const DynamicModel = mongoose.model(collectionName, dynamicSchema, collectionName);

                    // // // Insert the document into the collection
                    // const result = await DynamicModel.create({ name: "Shiva" });
                    // console.log(result);

                    // res.send(result)


                    // if (req.method === "POST") {
                    //     const newCollection = mongoose.connection.collection(schemaEntity.name);
                    //     console.log(newCollection)
                    //     if (!newCollection) mongoose.connection.createCollection(schemaEntity.name);

                    // }

                    // const logicEntity = await bussinessLogicsCollection.findOne({ schemaId: schemaEntity?.uuid, isDeleted: false, });

                    // if (!logicEntity) {
                    //     res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
                    // } else {
                    //     try {
                    //         next();
                    //         const evalutedFunc = eval(logicEntity.logic)(req, res, next);
                    //         if (!evalutedFunc) next();
                    //         else app.use('/' + projectName, evalutedFunc);
                    //     } catch (error) {
                    //         console.log(error);
                    //         res.status(500).send(`Unexpect error occured!`);
                    //     }
                    // }
                }
            }
        }
    }
}

app.use('/:projectName', validateRequest);

app.use('/:projectName', async (req: Request, res: Response, next: NextFunction) => {
    const typeFound = "req.body.types";
    if (!res.headersSent) {
        res.send(typeFound);
    }
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
