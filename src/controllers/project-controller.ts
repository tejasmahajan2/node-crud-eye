import express, { NextFunction, Request, Response } from 'express';
import mongoose from "mongoose";
import { AppError } from '../utils/AppError';
import { HttpStatus } from '../enums/http-status-enum';
import { ProjectMessages } from '../constants/message-constant';
import { HttpStatusCode } from '../enums/http-status-code-enum';
import Ajv from "ajv";
import addFormats from "ajv-formats";

const projectRouter = express.Router();
const ajv = new Ajv();
addFormats(ajv);

const projectsCollection = mongoose.connection.collection("projects");
const typesCollection = mongoose.connection.collection("types");
const schemaEntitiesCollection = mongoose.connection.collection("schemaentities");
const bussinessLogicsCollection = mongoose.connection.collection("bussinesslogics");


export async function validateProject(req: Request, res: Response, next: NextFunction) {
    const { projectName } = req.params;
    const projectFound = await projectsCollection.findOne({
        name: projectName,
        isDeleted: false
    });

    if (!projectFound) throw new AppError(HttpStatus.NotFound, ProjectMessages.Success.NotFound, HttpStatusCode.NotFound);

    req.body.projectEntity = projectFound;
    next();
}

export async function validateType(req: Request, res: Response, next: NextFunction) {
    const { projectEntity } = req.body;

    const typeFound = await typesCollection.findOne({
        projectId: projectEntity?.uuid,
        organizationId: projectEntity?.organizationId,
        isDeleted: false
    });

    if (!typeFound) throw new AppError(HttpStatus.NotFound, ProjectMessages.Success.NotFound, HttpStatusCode.NotFound);

    req.body.typeEntity = typeFound;
    next();
}

export async function validateSchema(req: Request, res: Response, next: NextFunction) {
    const { projectName } = req.params;
    const { typeEntity } = req.body;

    const resource = req.originalUrl.split(`/${projectName}/`)[1];

    const schemaEntity = await schemaEntitiesCollection.findOne({
        method: req.method.toLocaleLowerCase(),
        resource,
        uuid: typeEntity?.schemaId,
        isDeleted: false,
    });

    if (!schemaEntity) throw new AppError(HttpStatus.NotFound, ProjectMessages.Success.NotFound, HttpStatusCode.NotFound);

    const validate = ajv.compile(schemaEntity.schema);
    if (!validate(req.body)) {
        const errors = validate.errors?.map((e) => `${e?.message} "${e?.params?.additionalProperty}"`)?.join(',') || "";
        throw new AppError(HttpStatus.BadRequest, errors, HttpStatusCode.NotFound);
    }

    next();
}