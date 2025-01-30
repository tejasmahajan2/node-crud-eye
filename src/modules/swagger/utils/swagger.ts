import swaggerJsdoc from "swagger-jsdoc";
import { AppError } from "../../../common/utils/AppError";
import { collections } from "../../../common/utils/collections";
import { BaseSchemaFields } from "../../../common/schemas/base-schema";

export async function getSwaggerDocument(projectName: string) {

    const projectFound = await collections.projects.findOne({ name: projectName });
    if (!projectFound) throw new AppError('NOT_FOUND', 'Project not found', 404);

    const modulesFound = await collections.modules.find({
        projectId: projectFound?._id
    }).toArray();

    if (modulesFound.length === 0) throw new AppError('NOT_FOUND', 'Project not found', 404);

    const paths: any = {};

    for (const module of modulesFound) {
        const allResources = await collections.resources.find({ moduleId: module._id }).toArray();

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
            console.log(resourceFound?.schema?.properties)

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
                    200: {
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: { ...resourceFound?.schema?.properties, ...BaseSchemaFields }
                                }
                            }
                        }
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
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: { ...resourceFound?.schema?.properties, ...BaseSchemaFields }
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
                    200: {
                        content: {
                            "application/json": {
                                schema: {
                                    type: "object",
                                    properties: { ...resourceFound?.schema?.properties, ...BaseSchemaFields }
                                }
                            }
                        }
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

