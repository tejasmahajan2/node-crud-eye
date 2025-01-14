import mongoose, { Model } from "mongoose";
import swaggerJsdoc from "swagger-jsdoc";
import { AppError } from "./AppError";
import { collections } from "./collections";
import { Console } from "console";
import { BaseSchemaFields } from "../schemas/base-schema";

export function getCollection(collectionName: string) {
    try {
        return mongoose.connection.collection(collectionName);
    } catch (error) {
        throw error;
    }
}

export function generateSwaggerPaths_(projectFound: any, modulesFound: any) {
    const swaggerPaths: Record<string, object> = {};

    const basePath = `${projectFound.name}/${modulesFound.name}`;

    swaggerPaths[`${basePath}/{id}`] = {
        get: {
            summary: `Get a specific resource by ID for ${projectFound?.name} ${modulesFound?.name}`,
            tags: [projectFound?.name, modulesFound?.name],
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
    swaggerPaths[basePath] = {
        get: {
            summary: `Get all resources for ${projectFound?.name} ${modulesFound?.name}`,
            tags: [projectFound?.name, modulesFound?.name],
            responses: {
                200: {
                    description: `Successful retrieval of all ${projectFound?.name} ${modulesFound?.name}`,
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
            summary: `Create a new resource for ${projectFound?.name} ${modulesFound?.name}`,
            tags: [projectFound?.name, modulesFound?.name],
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
                    description: `Created a new resource for ${projectFound?.name} ${modulesFound?.name}`,
                },
            },
        },
        put: {
            summary: `Update a resource for ${projectFound?.name} ${modulesFound?.name}`,
            tags: [projectFound?.name, modulesFound?.name],
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
                    description: `Updated resource for ${projectFound?.name} ${modulesFound?.name}`,
                },
            },
        },
        delete: {
            summary: `Delete a resource for ${projectFound?.name} ${modulesFound?.name}`,
            tags: [projectFound?.name, modulesFound?.name],
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
                    description: `Deleted resource for ${projectFound?.name} ${modulesFound?.name}`,
                },
                404: {
                    description: "Resource not found",
                },
            },
        },
    };

    return swaggerPaths;
}


export async function generateSwaggerPaths(projectFound: any, modulesFound: any) {
    const swaggerPaths: Record<string, object> = {};

    for (const module of modulesFound) {
        const resourcesFound = await collections.resources.find({ moduleId: `${module._id}` }).toArray();
        if (resourcesFound.length === 0) continue;

        const resourceGroup: Record<string, object> = {};
        const basePath = `${projectFound.name}/${module.name}`;

        swaggerPaths[module.name] = resourceGroup;

        // 1. Always include POST and GET ALL
        resourceGroup[`${basePath}`] = {
            get: {
                summary: `Get all resources for ${projectFound?.name} ${module.name}`,
                tags: [projectFound?.name, module.name],
                responses: {
                    200: {
                        description: `Successful retrieval of all ${module.name}`,
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
                summary: `Create a new resource for ${projectFound?.name} ${module.name}`,
                tags: [projectFound?.name, module.name],
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
                        description: `Created a new resource for ${module.name}`,
                    },
                },
            },
        };

        // 2. Add GET (by ID), PUT, DELETE if they exist in DB
        for (const resource of resourcesFound) {
            const method = resource?.method?.toLowerCase();

            if (!method) continue;

            if (['get', 'put', 'delete'].includes(method)) {
                const path = `${basePath}/{id}`;

                if (!resourceGroup[path]) {
                    resourceGroup[path] = {};
                }

                (resourceGroup[path] as any)[method] = {
                    summary: resource.desc || `${method.toUpperCase()} a specific resource for ${module.name}`,
                    tags: [projectFound?.name, module.name],
                    parameters: [
                        {
                            in: "path",
                            name: "id",
                            required: true,
                            schema: {
                                type: "string",
                            },
                            description: "The ID of the resource",
                        },
                    ],
                    responses: {
                        200: {
                            description: `${method.toUpperCase()} operation successful for ${module.name}`,
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
                };

                // Add requestBody for PUT
                if (method === "put") {
                    (resourceGroup[path] as any)[method].requestBody = {
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
                    };
                }
            }
        }

        console.log({ resourceGroup });
    }

    return swaggerPaths;
}

export async function getSwaggerDocument(projectName: string) {

    const projectFound = await collections.projects.findOne({ name: projectName });
    if (!projectFound) throw new AppError('NOT_FOUND', 'Project not found', 404);

    const modulesFound = await collections.modules.find({
        projectId: `${projectFound?._id}`
    }).toArray();

    if (modulesFound.length === 0) throw new AppError('NOT_FOUND', 'Project not found', 404);

    const paths: any = {};

    for (const module of modulesFound) {
        const allResources = await collections.resources.find({ moduleId: `${module._id}` }).toArray();

        if (allResources.length === 0) continue;

        const moduleName = module.name;
        const basePath = `${projectFound.name}/${moduleName}`;

        const methodsToConfigure = allResources.map((resource) => resource.method.toUpperCase());

        // Initialize base path if it doesn't exist
        if (!paths[`/${basePath}`]) {
            paths[`/${basePath}`] = {};
        }

        // Conditionally add GET all resources
        if (methodsToConfigure.includes("GET")) {
            const resourceFound = allResources.find((resource) => resource.method === "GET");

            paths[`/${basePath}`]["get"] = {
                summary: `Get all ${moduleName}`,
                tags: [moduleName],
                responses: {
                    200: {
                        description: `List of all ${moduleName}`,
                        content: {
                            "application/json": {
                                schema: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: { ...resourceFound?.schema?.properties, ...BaseSchemaFields }
                                    }
                                }
                            }
                        }
                    },
                    404: {
                        description: `${moduleName} not found`,
                    },
                },
            };
        }

        // Conditionally add POST method
        if (methodsToConfigure.includes("POST")) {
            const resourceFound = allResources.find((resource) => resource.method === "POST");

            paths[`/${basePath}`]["post"] = {
                summary: `Create a new ${moduleName}`,
                tags: [moduleName],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: resourceFound?.schema?.properties
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        schema: {
                            type: "object",
                            properties: resourceFound?.schema?.properties
                        },
                        description: `${moduleName} created successfully`,
                    },
                    400: {
                        description: `Invalid request data for ${moduleName}`,
                    },
                }
            };
        }

        // Initialize base path with ID if it doesn't exist
        if (!paths[`/${basePath}/{id}`]) {
            paths[`/${basePath}/{id}`] = {};
        }

        // Conditionally add GET by ID
        if (methodsToConfigure.includes("GET_BY_ID")) {
            const resourceFound = allResources.find((resource) => resource.method === "GET_BY_ID");
            paths[`/${basePath}/{id}`]["get"] = {
                summary: `Get a ${moduleName} by ID`,
                tags: [moduleName],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                        description: `The ID of the ${moduleName}`,
                    },
                ],
                responses: {
                    200: {
                        schema: {
                            type: "object",
                            properties: { ...resourceFound?.schema?.properties, ...BaseSchemaFields }
                        },
                        description: `${moduleName} retrieved successfully`,
                    },
                    404: {
                        description: `${moduleName} not found`,
                    },
                },
            };
        }

        // Conditionally add PUT by ID
        if (methodsToConfigure.includes("PUT")) {
            const resourceFound = allResources.find((resource) => resource.method === "GET_BY_ID");
            paths[`/${basePath}/{id}`]["put"] = {
                summary: `Update a ${moduleName} by ID`,
                tags: [moduleName],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                        description: `The ID of the ${moduleName} to update`,
                    },
                ],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: {
                                type: "object",
                                properties: resourceFound?.schema?.properties
                            }
                        }
                    }
                },
                responses: {
                    201: {
                        schema: {
                            type: "object",
                            properties: { ...resourceFound?.schema?.properties, ...BaseSchemaFields }
                        },
                        description: `${moduleName} updated successfully`,
                    },
                    404: {
                        description: `${moduleName} not found`,
                    },
                }
            };
        }

        // Conditionally add DELETE by ID
        if (methodsToConfigure.includes("DELETE")) {
            paths[`/${basePath}/{id}`]["delete"] = {
                summary: `Delete a ${moduleName} by ID`,
                tags: [moduleName],
                parameters: [
                    {
                        in: "path",
                        name: "id",
                        required: true,
                        schema: { type: "string" },
                        description: `The ID of the ${moduleName} to delete`,
                    },
                ],
                responses: {
                    200: {
                        description: `${moduleName} deleted successfully`,
                    },
                    404: {
                        description: `${moduleName} not found`,
                    },
                }
            };
        }
    }

    const docs = swaggerJsdoc({
        definition: {
            openapi: "3.1.0",
            info: {
                title: `${projectName} API`,
                version: "1.0.0",
                description: `Swagger documentation for ${projectName}`,
            },
            basePath: `/${projectName}`,
            paths,
        },
        apis: ["./src/**/*.ts"], // Adjust to match your API file paths
    });

    return docs;
}

