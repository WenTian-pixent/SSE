import express from 'express';
import { StatusCodes } from 'http-status-codes';
import 'reflect-metadata';
import config from './config';

const clients = new Map();
const heartbeats = [];

function sendEvent(res, event, data, id = null) {
  if (!res) return;
  let message = '';
  if (id) message += `id: ${id}\n`;
  if (event) message += `event: ${event}\n`;
  message += `data: ${JSON.stringify(data)}\n\n`;

  res.write(message);
}

export function broadcast(event, data, userTokens = []) {
  const id = Date.now().toString();
  if (userTokens.length) {
    userTokens.forEach((userToken) => {
      sendEvent(clients.get(userToken), event, data, id);
    });
  } else {
    clients.forEach((client) => {
      sendEvent(client, event, data, id);
    });
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(
    express.urlencoded({
      extended: true,
    }),
  );

  app.get(`${config.api.prefix}/subscribe/:id`, (req, res) => {
    console.log('New client connecting...');
    res.writeHead(StatusCodes.OK, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    res.write(':connected\n\n');

    if (!req.params.id) {
      console.warn('Client connected without an ID. ');
      return;
    }

    const userToken = req.params.id;

    clients.set(userToken, res);
    console.log(`Client connected. Total clients: ${clients.size}`);
    clients.forEach((_, token) => console.log(` - ${token || 'anonymous'}`));

    const lastEventId = req.headers['last-event-id'];
    if (lastEventId) {
      console.log(`Client reconnecting with lastEventId: ${lastEventId}`);
    }

    const heartbeat = setInterval(() => {
      try {
        res.write(`:heartbeat\n\n`);
      } catch (error) {
        console.error('Heartbeat error:', error);
        clearInterval(heartbeat);
        clients.delete(userToken);
        console.log(`Heartbeat error client disconnected. Total clients: ${clients.size}`);
        clients.forEach((_, token) => console.log(` - ${token || 'anonymous'}`));
      }
    }, config.heartbeatInterval);

    heartbeats.push(heartbeat);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(userToken);
      console.log(`Client disconnected. Total clients: ${clients.size}`);
      clients.forEach((_, token) => console.log(` - ${token || 'anonymous'}`));
    });
  });

  await require('./loaders').default({ expressApp: app });

  const server = app
    .listen(config.port, () => {
      console.log(`
      ################################################
      🛡️  Server listening on port: ${config.port} 🛡️
      ################################################
    `);
    })
    .on('error', (_) => {
      console.error('Server encountered an error.');
      process.exit(1);
    });

  server.keepAliveTimeout = 3605000;
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

let isShuttingDown = false;

async function gracefulShutdown() {
  if (isShuttingDown) {
    return;
  }
  isShuttingDown = true;
  console.info('Received shutdown signal, preparing to close connections...');

  try {
    console.info('Closing server...');
    if (process.env.NODE_ENV === 'development') {
      console.info('Environment is development. Exiting immediately.');
      process.exit(0);
    }
    console.log('Server is shutting down...');
    heartbeats.forEach((heartbeat) => clearInterval(heartbeat));
    clients.clear();
    console.info(`Cleanup completed, shutting down in ${config.shutDown} seconds.`);
    for (let i = config.shutDown; i > 0; i--) {
      console.info(`Shutting down in ${i} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.info('Server shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

startServer();
