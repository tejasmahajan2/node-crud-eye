import { NextFunction, Request, Response } from 'express';
import mongoose from "mongoose";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { BaseSchemaFields } from '../schemas/base-schema';
import { collections } from '../utils/collections';

const ajv = new Ajv();
addFormats(ajv);

function getResourceComponents(req: Request) {
    let { 0: resourceName, projectName, id } = req.params;
    projectName = projectName.toLowerCase();
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
    const { resourceName, projectName } = getResourceComponents(req);
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
    const { resourceName, projectName } = getResourceComponents(req);
    const { projectEntity } = req.body;

    const moduleFound = await collections.modules.findOne({
        name: resourceName,
        projectId: projectEntity._id
    });



    if (!moduleFound) {
        res.status(404).send(`Cannot ${req.method} /${projectName}/${resourceName}`);
    } else {
        req.body.moduleEntity = moduleFound;
        next();
    }
}

export async function validateResource(req: Request, res: Response, next: NextFunction) {
    const { resourceName, projectName } = getResourceComponents(req);
    const { moduleEntity } = req.body;
    const resourceFound = await collections.resources.findOne({
        method: req.method,
        moduleId: moduleEntity._id
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

export async function performPreBusinessLogic(req: Request, res: Response, next: NextFunction) {
    const { resourceEntity } = req.body;

    const logicEntity = await collections.businessLogics.findOne({ trigger: "pre", resourceId: resourceEntity._id });

    if (logicEntity) {
        try {
            const logicFunction = eval(logicEntity.logic);  // Convert string to function

            if (typeof logicFunction === 'function') {
                await logicFunction(req, res, next);  // Execute the function

            }
        } catch (error) {
            console.error('Error in pre-business logic:', error);
        }
    } else {
        next();  // Ensure the middleware chain continues
    }

}

export async function processRequest(req: Request, res: Response, next: NextFunction) {
    const { resourceName, projectName, id } = getResourceComponents(req);
    const { projectEntity, moduleEntity, resourceEntity, ...body } = req.body;

    const modelName = `${projectName}_${resourceName}`.toLowerCase();
    const model = getOrCreateModel(modelName);

    try {
        let responseData;

        // Handle different HTTP methods dynamically
        responseData = await handleRequestByMethod(req, model, id, body);

        // Store response data in res.locals for further manipulation
        res.locals.responseData = responseData;

        next();  // Pass control to next middleware

    } catch (error) {
        console.error("Error in processRequest:", error);
        res.status(500).send("Internal Server Error");
    }
}

// Function to handle different HTTP methods
async function handleRequestByMethod(req: Request, model: any, id: string, body: any) {
    switch (req.method) {
        case "POST":
            return await model.create(body);
        case "GET":
            return id ? await model.findOne({ _id: id }) || "Entity not found." : await model.find({}) || "No entities found.";
        case "PUT":
            const found = await model.findOne({ _id: id });
            return found ? { message: (await model.updateOne({ _id: id }, body)).modifiedCount === 0 ? "Entity not modified" : "Entity modified" } : { message: "Entity not found." };
        case "DELETE":
            const deleted = await model.findByIdAndDelete({ _id: id });
            return { message: deleted ? "Entity deleted." : "Entity not found." };
        default:
            return `Cannot ${req.method} ${req.originalUrl}`;
    }
}

export async function performPostBusinessLogic(req: Request, res: Response, next: NextFunction) {
    const { resourceEntity } = req.body;

    const logicEntity = await collections.businessLogics.findOne({ trigger: "post", resourceId: resourceEntity?._id });

    if (logicEntity) {
        try {
            const logicFunction = eval(logicEntity.logic);
            if (typeof logicFunction === "function") {
                await logicFunction(req, res);  // Execute the logic function
            }
        } catch (error) {
            console.error("Error in post-business logic:", error);
        }
    }

    // Pass control to the next middleware, which will send the response
    next();
}
