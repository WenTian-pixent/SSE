import { Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import sample from './routes/sample';

export default () => {
  const app = Router();
  app.get('/health', (_, res) => res.status(StatusCodes.OK).send('sse-health-check-ok'));
  sample(app);
  return app;
};
