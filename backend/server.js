// backend/server.js (Only showing the necessary imports and route registration)

import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import postRoutes from "./routes/postRoutes.js";
// backend/server.js

import express from "express";
// ... (other imports)
import tournamentRoutes from "./routes/tournamentRoutes.js";

// FIX: Add the .js extension to the import path
import chatRoutes from "./routes/chatbot.js"; 


dotenv.config();
// ... (rest of the file remains the same)
connectDB();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Make io accessible to all routes
app.set('io', io);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/tournaments", tournamentRoutes);

// ⬅️ REGISTER THE NEW CHATBOT API ROUTE ➡️
app.use("/api/chat", chatRoutes); 

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  
  socket.on("join_match_room", (matchId) => {
    socket.join(matchId);
    console.log(`User ${socket.id} joined room for match ${matchId}`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));