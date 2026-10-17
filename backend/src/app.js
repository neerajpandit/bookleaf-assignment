import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { loadConfig } from './config/index.js';
import routes from './routes/index.js';
import { setupSwagger } from './config/swagger.js';
import notFoundHandler from './middleware/notFound.js';
import errorHandler from './middleware/errorHandler.js';

const createApp = () => {
  const config = loadConfig();
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.clientUrl,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));

  app.use('/api/v1', routes);

  setupSwagger(app);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
