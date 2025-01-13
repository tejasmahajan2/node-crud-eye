import { NextFunction, Request, Response } from 'express';
import mongoose from "mongoose";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { BaseSchemaFields } from '../schemas/base-schema';

const ajv = new Ajv();
addFormats(ajv);

const projectsCollection = mongoose.connection.collection("projects");
const modulesCollection = mongoose.connection.collection("modules");
const resourcesCollection = mongoose.connection.collection("resources");

function getResourceComponents(req: Request) {
    const { 0: resourceName, projectName, id } = req.params;
    return { resourceName, projectName, id };
}

function getOrCreateModel(collectionName: string) {
    // Create a generic schema and models
    let DynamicModel = mongoose.models[collectionName];
    if (!DynamicModel) {
        const dynamicSchema = new mongoose.Schema(BaseSchemaFields, { strict: false });
        DynamicModel = mongoose.model(collectionName, dynamicSchema, collectionName);
    }

    return DynamicModel;
}

export async function validateProject(req: Request, res: Response, next: NextFunction) {
    const { resourceName, projectName, id } = getResourceComponents(req);

    const projectFound = await projectsCollection.findOne({
        name: projectName
    });

    if (!projectFound) {
        res.status(404).send(`Cannot ${req.method} /${projectName}/${resourceName}`);
    } else {
        req.body.projectEntity = projectFound;
        next();
    }
}


export async function validateModule(req: Request, res: Response, next: NextFunction) {
    const { resourceName, projectName, id } = getResourceComponents(req);
    const { projectEntity } = req.body;
 
    const moduleFound = await modulesCollection.findOne({
        name: resourceName,
        projectId: `${projectEntity._id}`
    });

    if (!moduleFound) {
        res.status(404).send(`Cannot ${req.method} /${projectName}/${resourceName}`);
    } else {
        req.body.moduleEntity = moduleFound;
        next();
    }
}

export async function validateResource(req: Request, res: Response, next: NextFunction) {
    const { resourceName, projectName, id } = getResourceComponents(req);
    const { projectEntity, moduleEntity } = req.body;

    req.method = req.method === "PATCH" ? "PUT" : req.method;
    const resourceFound = await resourcesCollection.findOne({
        name: req.method.toLowerCase(),
        moduleId: `${moduleEntity._id}`
    });

    if (!resourceFound) {
        res.status(404).send(`Cannot ${req.method} /${projectName}/${resourceName}`);
    } else {
        req.body.resourceEntity = resourceFound;
        next();
    }
}


export async function validateParams(req: Request, res: Response, next: NextFunction) {
    const { resourceName, projectName, id } = getResourceComponents(req);
    const { projectEntity, moduleEntity, resourceEntity, ...body } = req.body;

    const modelName = `${projectName}_${resourceName}`.toLowerCase();
    const model = getOrCreateModel(modelName);

    // Do not allow for post method that contains url param
    if (id && req.method === "POST") {
        res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
    } else if (id && req.method !== "POST") {
        // Allow for get, put, delete, patch method that contains url param and validate obj id
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ error: "Invalid ObjectId" });
        } else {
            // but if method is get with url params then get specific resource
            if (req.method === "GET") {
                res.send(await model.findOne({_id : id}))
            } else {
                const validate = ajv.compile(resourceEntity.schema);
                if (!validate(body)) {
                    res.status(400).json({ errors: validate.errors });
                } else {
                    // else validate payload sent
                    next();
                }
            }
        }
    } else {
        res.send(await model.find())
        // res.send("Only" + req.method)
        // next();
    }
}

export async function validatePayload(req: Request, res: Response, next: NextFunction) {
    const { resourceName, projectName, id } = getResourceComponents(req);
    const { projectEntity, moduleEntity, resourceEntity, ...body } = req.body;

    
    const modelName = `${projectName}_${resourceName}`.toLowerCase();
    const model = getOrCreateModel(modelName);

    if (req.method === "GET") {
        res.send(await model.find({}));
    } else {
        const validate = ajv.compile(resourceEntity.schema);
        if (!validate(body)) {
            res.status(400).json({ errors: validate.errors });
        } else {
            next();
        }
    }
}

export async function processRequest(req: Request, res: Response, next: NextFunction) {
    const { resourceName, projectName, id } = getResourceComponents(req);
    const { projectEntity, moduleEntity, resourceEntity, ...body } = req.body;

    const modelName = `${projectName}_${resourceName}`.toLowerCase();
    const model = getOrCreateModel(modelName);

    switch (req.method) {
        case "POST":
            res.send(await model.create(body));
            break;
        case "PUT":
            res.send(await model.findOneAndUpdate({ _id: id }, body));
            break;
        default:
            next();
            break;
    }
}

// export async function validateSchema(req: Request, res: Response, next: NextFunction) {
//     const { projectName } = req.params;
//     const { typeEntity, projectEntity, ...body } = req.body;

//     const resourceComponents = req.originalUrl.replace(`/${projectName}/`, "").split('/').filter(endpoints => endpoints !== '');

//     console.log(resourceComponents)
//     const resource = resourceComponents[0];
//     const id = resourceComponents[1];
//     console.log(resource)

//     const schemaEntity = await schemaEntitiesCollection.findOne({
//         method: req.method.toLocaleLowerCase(),
//         resource,
//         uuid: typeEntity?.schemaId,
//         isDeleted: false,
//     });

//     if (!schemaEntity) {
//         res.status(404).send(`Cannot ${req.method} /${projectName}`);
//     } else {
//         console.log(schemaEntity);
//         // Check if the collection exists
//         const collectionName = `${projectName}_${resource}`.toLocaleLowerCase();

//         // Create a generic schema and models
//         let DynamicModel = getOrCreateModel(collectionName)

//         const validationMethods = ["POST", "PUT", "PATCH"];

//         if (validationMethods.includes(req.method)) {
//             const validate = ajv.compile(schemaEntity.schema);
//             console.log(body)
//             if (!validate(body)) {
//                 // const errors = validate.errors?.map((e) => `${e?.message} "${e?.params?.additionalProperty}"`);
//                 res.status(400).json({ errors: validate.errors });
//             } else {
//                 switch (req?.method) {
//                     case "POST":
//                         res.send(await DynamicModel.create(body));
//                         break;
//                     case "PUT":
//                         if (id) {
//                             if (!mongoose.Types.ObjectId.isValid(id)) {
//                                 res.status(400).json({ error: 'Invalid ObjectId' });
//                             } else {
//                                 res.send(await DynamicModel.findOne({ _id: id }));
//                             }
//                         } else {
//                             res.status(404).send(`Cannot ${req.method} /${projectName}`);
//                         }
//                         break;
//                     default:
//                         break;
//                 }
//             }
//         } else {
//             switch (req?.method) {
//                 case "GET":
//                     if (id) {
//                         if (!mongoose.Types.ObjectId.isValid(id)) {
//                             res.status(400).json({ error: 'Invalid ObjectId' });
//                         } else {
//                             res.send(await DynamicModel.findOne({ _id: id }));
//                         }
//                     } else {
//                         res.send(await DynamicModel.find());
//                     }
//                     break;
//                 case "POST":
//                 default:
//                     break;
//             }
//         }

//         next();
//     }
// }