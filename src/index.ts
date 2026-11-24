import fs from "fs";
import path from "path";
import { Hono } from "hono";
import { errorHandler } from "./errorHandler.js";
import routes from "./routes.js";

const app = new Hono();
const publicDir = path.resolve("./public");

// Helper per servire file statici dal frontend
function sendFile(c: any, filename: string, contentType: string) {
  const filePath = path.join(publicDir, filename);
  if (!fs.existsSync(filePath)) {
    return c.text("Not found", 404);
  }
  return c.body(fs.readFileSync(filePath), 200, {
    "Content-Type": contentType,
  });
}

// Monta il middleware di error handling PRIMA delle route
app.use(errorHandler);

// Monta il router API sotto il prefisso /api
app.route("/api", routes);
app.get("/health", (c) => c.json({ status: "ok" }));
app.get("/", (c) => sendFile(c, "index.html", "text/html; charset=utf-8"));
app.get("/style.css", (c) => sendFile(c, "style.css", "text/css; charset=utf-8"));
app.get("/app.js", (c) => sendFile(c, "app.js", "application/javascript; charset=utf-8"));

export default app;
export const handler = app;
