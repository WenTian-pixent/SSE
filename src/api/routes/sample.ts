import { Router } from 'express';
import { cacheServiceInstance } from 'src/services/cache';
import { broadcast } from '../../app';
import { BaseRoutes } from './routes';

const route = Router();

export default (app: Router) => {
  app.use(BaseRoutes.SAMPLE, route);

  route.post('/all', (req, res) => {
    const { title, message, severity } = req.body;

    broadcast('notification', {
      title,
      message,
      severity: severity || 'info',
      timestamp: new Date().toISOString(),
    });

    res.json({ status: 'sent' });
  });

  route.post('/sendToUsers', (req, res) => {
    const { userTokens, title, message, severity } = req.body;

    broadcast(
      'notification',
      {
        title,
        message,
        severity: severity || 'info',
        timestamp: new Date().toISOString(),
      },
      userTokens,
    );

    res.json({ status: 'sent' });
  });

  route.post('/publish', async (req, res) => {
    const { channelName, title, message, severity } = req.body;

    await cacheServiceInstance.publishToChannel(channelName, { title, message, severity });

    res.json({ status: 'sent' });
  });
};
