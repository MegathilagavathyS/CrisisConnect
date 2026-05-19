import { type Express } from "express";
import chatRouter from "./chat";
import crisisRouter from "./crisis";

export async function registerRoutes(app: Express) {
  app.use("/api", chatRouter);
  app.use("/api", crisisRouter);
  return app.listen(0);
}