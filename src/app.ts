import http from "node:http";
import { Readable } from "node:stream";
import app from "./index.js";

// Porta di ascolto del server, può essere sovrascritta via env PORT
const port = Number(process.env.PORT ?? 3000);

// Stampa in console le route registrate per debugging durante lo sviluppo
try {
  // @ts-ignore
  if (typeof app.showRoutes === "function") app.showRoutes();
} catch (e) {
  // ignore
}

type RequestInitWithDuplex = RequestInit & { duplex?: "half" | "full" };

// Il server Node crea una request Web compatibile con Hono
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  const init: RequestInitWithDuplex = {
    method: req.method,
    headers: req.headers as HeadersInit,
  };

  // Se la richiesta ha un body, abilitiamo il duplex stream richiesto da Node
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = Readable.toWeb(req) as unknown as BodyInit;
    init.duplex = "half";
  }

  const request = new Request(url.toString(), init);
  const response = await app.fetch(request);
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));

  if (response.body) {
    const body = Buffer.from(await response.arrayBuffer());
    res.end(body);
    return;
  }

  res.end();
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other process or change PORT.`);
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
