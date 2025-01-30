import dotenv from "dotenv";
dotenv.config({});

import express, { Express, Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/database";
import projectRouter from "./modules/project/project-router";
import swaggerRouter from "./modules/swagger/swagger-router";

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(swaggerRouter);
app.use(projectRouter);

connectDB();

app.get("/", (req: Request, res: Response) => {
    res.send("Express + TypeScript Server");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
