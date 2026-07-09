import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cors from "cors";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";

import authRoutes from "./src/routes/auth.routes";
import navigationRoutes from "./src/routes/navigation.routes";
import reportsRoutes from "./src/routes/reports.routes";
import sosRoutes from "./src/routes/sos.routes";
import chatRoutes from "./src/routes/chat.routes";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Make io accessible in controllers
app.set("io", io);

app.get("/health", (req: express.Request, res: express.Response) => {
  res.json({ status: "ok", service: "saferoute-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/navigation", navigationRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/sos", sosRoutes);
app.use("/api/chat", chatRoutes);

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // "Follow Me" live location channel
  socket.on("location:update", (data) => {
    // Broadcast to the room of whoever is "following" this user
    if (data && data.sessionId) {
      socket.to(data.sessionId).emit("location:broadcast", data);
    }
  });

  socket.on("session:join", (sessionId) => {
    socket.join(sessionId);
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`SafeRoute backend running on port ${PORT}`);
});
