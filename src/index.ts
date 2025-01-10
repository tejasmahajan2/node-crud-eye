import dotenv from "dotenv";
dotenv.config({});

import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/database";
import mongoose from "mongoose";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import swaggerRouter from "./routes/swagger-routes";
import { BaseSchemaFields } from "./schemas/base-schema";

const ajv = new Ajv();
addFormats(ajv);

const app: Express = express();
connectDB();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
app.use('/', swaggerRouter);

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
            // If methods is not POST or PUT we dont need to validate schema
            const resource = req.originalUrl.split(`/${projectName}/`)[1];
            console.log(resource);

            const schemaEntity = await schemaEntitiesCollection.findOne({
                method: req.method.toLocaleLowerCase(),
                resource,
                uuid: typeFound?.schemaId,
                isDeleted: false,
            });

            if (!schemaEntity) {
                res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
            } else {
                // Check if the collection exists
                const collectionName = `${projectName}_${resource}`.toLocaleLowerCase();

                // Create a generic schema and models
                let DynamicModel = mongoose.models[collectionName];
                if (!DynamicModel) {
                    const dynamicSchema = new mongoose.Schema(BaseSchemaFields, { strict: false });
                    DynamicModel = mongoose.model(collectionName, dynamicSchema, collectionName);
                }

                const validationMethods = ["POST", "PUT", "PATCH"];

                if (validationMethods.includes(req.method)) {
                    const validate = ajv.compile(schemaEntity.schema);
                    if (!validate(req.body)) {
                        // const errors = validate.errors?.map((e) => `${e?.message} "${e?.params?.additionalProperty}"`);
                        res.status(400).json({ errors : validate.errors });
                    } else {
                        switch (req?.method) {
                            case "POST":
                                res.send(await DynamicModel.create(req.body));
                                break;
                            default:
                                break;
                        }
                    }
                } else {
                    switch (req?.method) {
                        case "GET":
                            res.send(await DynamicModel.find());
                            break;
                        case "POST":
                        default:
                            break;
                    }
                }

            }


            // if (!schemaEntity) {
            //     res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
            // } else {
            //     const validate = ajv.compile(schemaEntity.schema);
            //     if (!validate(req.body)) {
            //         const errors = validate.errors?.map((e) => `${e?.message} "${e?.params?.additionalProperty}"`);
            //         res.status(400).json({ errors });
            //     } else {

            //         // Check if the collection exists
            //         const collectionName = `${projectName}_${resource}`.toLocaleLowerCase();

            //         let DynamicModel = mongoose.models[collectionName];
            //         if (!DynamicModel) {
            //             // Create a generic schema
            //             const dynamicSchema = new mongoose.Schema(BaseSchemaFields, { strict: false });
            //             DynamicModel = mongoose.model(collectionName, dynamicSchema, collectionName);
            //         }

            //         switch (req?.method) {
            //             case "GET":
            //                 res.send(await DynamicModel.find());
            //                 break;
            //             case "POST":
            //                 res.send(await DynamicModel.create(req.body));
            //                 break;
            //             default:
            //                 break;
            //         }

            //         // const logicEntity = await bussinessLogicsCollection.findOne({ schemaId: schemaEntity?.uuid, isDeleted: false, });

            //         // if (!logicEntity) {
            //         //     res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
            //         // } else {
            //         //     try {
            //         //         next();
            //         //         const evalutedFunc = eval(logicEntity.logic)(req, res, next);
            //         //         if (!evalutedFunc) next();
            //         //         else app.use('/' + projectName, evalutedFunc);
            //         //     } catch (error) {
            //         //         console.log(error);
            //         //         res.status(500).send(`Unexpect error occured!`);
            //         //     }
            //         // }
            //     }
            // }
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

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
