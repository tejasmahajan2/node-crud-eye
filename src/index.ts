import dotenv from "dotenv";
dotenv.config({});

import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import connectDB from "./config/database";
import swaggerRouter from "./routes/swagger-router";
import projectRouter from "./routes/project-router";


const app: Express = express();

app.use(cors());
app.use(express.json());
app.use('/', swaggerRouter);
app.use('/', projectRouter);

connectDB();

app.get('/:projectName', (req, res) => {
    res.send(`Project: ${req.params.projectName}`);
});

app.get("/", (req: Request, res: Response) => {
    res.send("Express + TypeScript Server");
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
