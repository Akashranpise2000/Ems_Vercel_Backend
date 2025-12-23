import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.status(200).send("EMS Backend running on Vercel 🚀");
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
import authRoutes from '../routes/auth.js';
import employeeRoutes from '../routes/employees.js';
import attendanceRoutes from '../routes/attendance.js';

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
// TODO: Add other routes

// ❌ DO NOT use app.listen() here
export default app;
