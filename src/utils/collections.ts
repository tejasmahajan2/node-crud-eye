import mongoose from "mongoose";

export const collections = {
    users: mongoose.connection.collection("users"),
    organizations: mongoose.connection.collection("organizations"),
    projects: mongoose.connection.collection("projects"),
    modules: mongoose.connection.collection("modules"),
    resources: mongoose.connection.collection("resources"),
}