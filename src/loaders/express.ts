import { isCelebrateError } from 'celebrate';
import cors from 'cors';
import express from 'express';
import { StatusCodes } from 'http-status-codes';
import routes from '../api';
import config from '../config';

export default async ({ app }: { app: express.Application }): Promise<void> => {
  app.get('/status', (_, res) => {
    res.status(200).end();
  });
  app.head('/status', (_, res) => {
    res.status(200).end();
  });

  // Useful if you're behind a reverse proxy (Heroku, Bluemix, AWS ELB, Nginx, etc)
  // It shows the real origin IP in the heroku or Cloudwatch logs
  app.enable('trust proxy');

  // The magic package that prevents frontend developers going nuts
  // Alternate description:
  // Enable Cross Origin Resource Sharing to all origins by default
  app.use(cors());

  // Some sauce that always add since 2014
  // "Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it."
  // Maybe not needed anymore ?
  app.use(require('method-override')());

  // Load API routes
  app.use(config.api.prefix, routes());

  // catch 404 and forward to error handler
  app.use((_, _r, next) => {
    const err = new Error('Not Found');
    next({ status: StatusCodes.NOT_FOUND, message: err.message });
  });

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (isCelebrateError(err)) {
      let message = '';
      for (const value of err.details.values()) {
        message += value.message + '; ';
      }

      return res.status(StatusCodes.BAD_REQUEST).json({ code: 2400, message });
    }

    res.status(StatusCodes.INTERNAL_SERVER_ERROR);
    return res.json({
      code: err?.response?.data?.code ?? 5000,
      message: err?.response?.data?.message ?? err.message,
    });
  });
};
