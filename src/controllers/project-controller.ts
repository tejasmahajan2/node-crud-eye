import { NextFunction, Request, Response } from 'express';
import mongoose from "mongoose";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { BaseSchemaFields } from '../schemas/base-schema';
import { collections } from '../utils/collections';

const ajv = new Ajv();
addFormats(ajv);

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

    const projectFound = await collections.projects.findOne({
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

    const moduleFound = await collections.modules.findOne({
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
    const { moduleEntity } = req.body;

    const resourceFound = await collections.resources.findOne({
        method: req.method,
        moduleId: `${moduleEntity._id}`
    });

    if (!resourceFound) {
        res.status(404).send(`Cannot ${req.method} /${projectName}/${resourceName}`);
    } else {
        req.body.resourceEntity = resourceFound;
        next();
    }
}

export async function validateMethods(req: Request, res: Response, next: NextFunction) {
    const { id } = getResourceComponents(req);
    if (
        (id && req.method === "POST") ||
        (!id && req.method === "PUT")
    ) {
        res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
    } else {
        next();
    }
}

export async function validateParams(req: Request, res: Response, next: NextFunction) {
    const { id } = getResourceComponents(req);

    if (id && !mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ error: "Invalid ObjectId" });
    } else {
        next();
    }
}

export async function validatePayload(req: Request, res: Response, next: NextFunction) {
    const { projectEntity, moduleEntity, resourceEntity, ...body } = req.body;

    if (["POST", "PUT"].includes(req.method)) {
        const validate = ajv.compile(resourceEntity.schema);
        if (!validate(body)) {
            res.status(400).json({ errors: validate.errors });
        } else {
            next();
        }
    } else {
        next();
    }
}

export async function processRequest(req: Request, res: Response, next: NextFunction) {
    const { resourceName, projectName, id } = getResourceComponents(req);
    const { projectEntity, moduleEntity, resourceEntity, ...body } = req.body;

    const modelName = `${projectName}_${resourceName}`.toLowerCase();
    const model = getOrCreateModel(modelName);
    if (req.method === "POST") {
        const created = await model.create(body);
        res.send(created);
    } else if (req.method === "GET" && id) {
        const retrieved = await model.findOne({ _id: id });
        if (retrieved) {
            res.send(retrieved);
        } else {
            res.send("Entity not found.");
        }
    } else if (req.method === "GET" && !id) {
        const retrievedAll = await model.find({});
        if (retrievedAll?.length > 0) {
            res.send(retrievedAll);
        } else {
            res.send("No entities found.");
        }
    } else if (req.method === "PUT") {
        const found = await model.findOne({ _id: id });
        if (found) {
            const updated = await model.updateOne({ _id: id }, body);
            res.send(updated.modifiedCount === 0 ? "Entity not modified" : "Entity modified");
        } else {
            res.send("Entity not found.");
        }
    } else if (req.method === "DELETE") {
        const deleted = await model.findByIdAndDelete({ _id: id });
        if (deleted) {
            res.send("Entity deleted.");
        } else {
            res.send("Entity not found.");
        }
    } else {
        res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
    }

}

// async function validateRequest(req: Request, res: Response, next: NextFunction) {
//     const { projectName } = req.params;
//     const projectFound = await collections.projects.findOne({
//         name: projectName,
//         isDeleted: false
//     });

//     if (!projectFound) {
//         res.status(404).send(`Cannot ${req.method} /${projectName}`);
//     } else {
//         const typeFound = await typesCollection.findOne({
//             projectId: projectFound?.uuid,
//             organizationId: projectFound?.organizationId,
//             isDeleted: false
//         });

//         if (!typeFound) {
//             res.status(404).send(`Cannot ${req.method} /${projectName}`);
//         } else {
//             // If methods is not POST or PUT we dont need to validate schema
//             const resource = req.originalUrl.split(`/${projectName}/`)[1];
//             console.log(resource);

//             const schemaEntity = await schemaEntitiesCollection.findOne({
//                 method: req.method.toLocaleLowerCase(),
//                 resource,
//                 uuid: typeFound?.schemaId,
//                 isDeleted: false,
//             });

//             if (!schemaEntity) {
//                 res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
//             } else {
//                 // Check if the collection exists
//                 const collectionName = `${projectName}_${resource}`.toLocaleLowerCase();

//                 // Create a generic schema and models
//                 let DynamicModel = mongoose.models[collectionName];
//                 if (!DynamicModel) {
//                     const dynamicSchema = new mongoose.Schema(BaseSchemaFields, { strict: false });
//                     DynamicModel = mongoose.model(collectionName, dynamicSchema, collectionName);
//                 }

//                 const validationMethods = ["POST", "PUT", "PATCH"];

//                 if (validationMethods.includes(req.method)) {
//                     const validate = ajv.compile(schemaEntity.schema);
//                     if (!validate(req.body)) {
//                         // const errors = validate.errors?.map((e) => `${e?.message} "${e?.params?.additionalProperty}"`);
//                         res.status(400).json({ errors: validate.errors });
//                     } else {
//                         switch (req?.method) {
//                             case "POST":
//                                 res.send(await DynamicModel.create(req.body));
//                                 break;
//                             default:
//                                 break;
//                         }
//                     }
//                 } else {
//                     switch (req?.method) {
//                         case "GET":
//                             res.send(await DynamicModel.find());
//                             break;
//                         case "POST":
//                         default:
//                             break;
//                     }
//                 }

//             }


//             // if (!schemaEntity) {
//             //     res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
//             // } else {
//             //     const validate = ajv.compile(schemaEntity.schema);
//             //     if (!validate(req.body)) {
//             //         const errors = validate.errors?.map((e) => `${e?.message} "${e?.params?.additionalProperty}"`);
//             //         res.status(400).json({ errors });
//             //     } else {

//             //         // Check if the collection exists
//             //         const collectionName = `${projectName}_${resource}`.toLocaleLowerCase();

//             //         let DynamicModel = mongoose.models[collectionName];
//             //         if (!DynamicModel) {
//             //             // Create a generic schema
//             //             const dynamicSchema = new mongoose.Schema(BaseSchemaFields, { strict: false });
//             //             DynamicModel = mongoose.model(collectionName, dynamicSchema, collectionName);
//             //         }

//             //         switch (req?.method) {
//             //             case "GET":
//             //                 res.send(await DynamicModel.find());
//             //                 break;
//             //             case "POST":
//             //                 res.send(await DynamicModel.create(req.body));
//             //                 break;
//             //             default:
//             //                 break;
//             //         }

//             //         // const logicEntity = await bussinessLogicsCollection.findOne({ schemaId: schemaEntity?.uuid, isDeleted: false, });

//             //         // if (!logicEntity) {
//             //         //     res.status(404).send(`Cannot ${req.method} ${req.originalUrl}`);
//             //         // } else {
//             //         //     try {
//             //         //         next();
//             //         //         const evalutedFunc = eval(logicEntity.logic)(req, res, next);
//             //         //         if (!evalutedFunc) next();
//             //         //         else app.use('/' + projectName, evalutedFunc);
//             //         //     } catch (error) {
//             //         //         console.log(error);
//             //         //         res.status(500).send(`Unexpect error occured!`);
//             //         //     }
//             //         // }
//             //     }
//             // }
//         }
//     }
// }
