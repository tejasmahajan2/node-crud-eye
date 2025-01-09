import mongoose, { Model } from "mongoose";
import swaggerJsdoc from "swagger-jsdoc";

export function getCollection(collectionName : string) {
    try {
        return mongoose.connection.collection(collectionName);
    } catch (error) {
        throw error;
    }
}

export function generateSwaggerPaths(projectFound: any, typeFound: any) {
    const projectName = projectFound?.name;
    const swaggerPaths: any = {};

    swaggerPaths[`${projectName}/{id}`] = {
        get: {
            summary: `Get a specific resource by ID for ${projectFound?.name} ${typeFound?.name}`,
            tags: [projectFound?.name, typeFound?.name],
            parameters: [
                {
                    in: "path",
                    name: "id",
                    required: true,
                    schema: {
                        type: "string",
                    },
                    description: "The ID of the resource to retrieve",
                },
            ],
            responses: {
                200: {
                    description: `Successful retrieval of resource with ID`,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    description: { type: "string" },
                                },
                            },
                        },
                    },
                },
                404: {
                    description: "Resource not found",
                },
            },
        },
    };

    // Define Swagger documentation for the route
    swaggerPaths[projectName] = {
        get: {
            summary: `Get all resources for ${projectFound?.name} ${typeFound?.name}`,
            tags: [projectFound?.name, typeFound?.name],
            responses: {
                200: {
                    description: `Successful retrieval of all ${projectFound?.name} ${typeFound?.name}`,
                    content: {
                        "application/json": {
                            schema: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        name: { type: "string" },
                                        description: { type: "string" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        post: {
            summary: `Create a new resource for ${projectFound?.name} ${typeFound?.name}`,
            tags: [projectFound?.name, typeFound?.name],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                description: { type: "string" },
                            },
                        },
                    },
                },
            },
            responses: {
                201: {
                    description: `Created a new resource for ${projectFound?.name} ${typeFound?.name}`,
                },
            },
        },
        put: {
            summary: `Update a resource for ${projectFound?.name} ${typeFound?.name}`,
            tags: [projectFound?.name, typeFound?.name],
            parameters: [
                {
                    in: "path",
                    name: "id",
                    required: true,
                    schema: {
                        type: "string",
                    },
                    description: "The ID of the resource to update",
                },
            ],
            requestBody: {
                required: true,
                content: {
                    "application/json": {
                        schema: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                description: { type: "string" },
                            },
                        },
                    },
                },
            },
            responses: {
                200: {
                    description: `Updated resource for ${projectFound?.name} ${typeFound?.name}`,
                },
            },
        },
        delete: {
            summary: `Delete a resource for ${projectFound?.name} ${typeFound?.name}`,
            tags: [projectFound?.name, typeFound?.name],
            parameters: [
                {
                    in: "path",
                    name: "id",
                    required: true,
                    schema: {
                        type: "string",
                    },
                    description: "The ID of the resource to delete",
                },
            ],
            responses: {
                200: {
                    description: `Deleted resource for ${projectFound?.name} ${typeFound?.name}`,
                },
                404: {
                    description: "Resource not found",
                },
            },
        },
    };

    return swaggerPaths;

}

export async function getSwaggerDocument(projectName: string) {
    const projectsCollection = mongoose.connection.collection("projects");

    const projectFound = await projectsCollection.findOne({ name: projectName });
    if (!projectFound) return { error: "Project not found" };

    const typesCollection = mongoose.connection.collection("types");
    const typeFound = await typesCollection.findOne({
        projectId: projectFound?.uuid,
        organizationId: projectFound?.organizationId,
    });

    if (!typeFound) return { error: "Type not found" };

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

    return docs;
}

