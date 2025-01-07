import mongoose, { ConnectOptions } from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    // Ensure that `MONGO_URI` is available in the environment
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MongoDB URI is not defined in environment variables");
    }

    // Establish the connection to MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as ConnectOptions);

    console.log("Database connected successfully");
  } catch (err) {
    console.error("Database connection error:", err);
    process.exit(1);
  }
};

export default connectDB;