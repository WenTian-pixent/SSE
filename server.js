const express = require("express");
const app = express();
app.use(express.json());

const clients = new Map();
const heartbeats = [];

function sendEvent(res, event, data, id = null) {
  let message = "";
  if (id) message += `id: ${id}\n`;
  if (event) message += `event: ${event}\n`;
  message += `data: ${JSON.stringify(data)}\n\n`;

  res.write(message);
}

function broadcast(event, data) {
  const id = Date.now().toString();
  clients.forEach((client) => {
    sendEvent(client, event, data, id);
  });
}

app.get("/events/:id", (req, res) => {
  console.log("New client connecting...");
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  res.write(":connected\n\n");

  clients.set(req.params.id, res);
  console.log(`Client connected. Total clients: ${clients.size}`);

  const lastEventId = req.headers["last-event-id"];
  if (lastEventId) {
    console.log(`Client reconnecting with lastEventId: ${lastEventId}`);
  }

  const heartbeat = setInterval(() => {
    try {
      res.write(
        `event: heartbeat\ndata: ${JSON.stringify({ heartbeat: true, id: Date.now().toISOString() })}\n\n`,
      );
    } catch (error) {
      clearInterval(heartbeat);
      clients.delete(res);
    }
  }, 10000);

  heartbeats.push(heartbeat);

  req.on("close", () => {
    clearInterval(heartbeat);
    clients.delete(req.params.id);
    console.log(`Client disconnected. Total clients: ${clients.size}`);
  });
});

app.post("/api/notifications", (req, res) => {
  const { title, message, severity } = req.body;

  broadcast("notification", {
    title,
    message,
    severity: severity || "info",
    timestamp: new Date().toISOString(),
  });

  res.json({
    status: "sent",
    clientCount: clients.size,
  });
});

app
  .listen(3030, () => {
    console.log(`
      ################################################
      🛡️  Server listening on port: ${3030} 🛡️
      ################################################
    `);
  })
  .on("error", (_) => {
    console.error("Server encountered an error.");
    process.exit(1);
  });

process.on("SIGINT", () => {
  heartbeats.forEach((heartbeat) => clearInterval(heartbeat));
  clients.clear();
  console.log("Server is shutting down...");
  process.exit();
});
