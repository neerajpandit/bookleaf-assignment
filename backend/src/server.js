import { loadConfig } from './config/index.js';
import { connectDB, disconnectDB } from './config/database.js';
import createApp from './app.js';
import { loadAiConfig } from './modules/ai/aiConfig.js';
import { initializeAiProvider } from './modules/ai/aiProviderFactory.js';

const SHUTDOWN_TIMEOUT_MS = 10000;

const bootstrap = async () => {
  let server;

  try {
    const config = loadConfig();
    const aiConfig = loadAiConfig();

    if (aiConfig.enabled) {
      initializeAiProvider();
      console.log(`AI provider initialized: ${aiConfig.provider} (${aiConfig.provider === 'openai' ? aiConfig.openai.model : aiConfig.ollama.model})`);
    }

    await connectDB(config.mongodbUri);

    const app = createApp();

    server = app.listen(config.port, () => {
      console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
    });

    const shutdown = (signal) => {
      console.log(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        try {
          await disconnectDB();
          console.log('Shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error.message);
          process.exit(1);
        }
      });

      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, SHUTDOWN_TIMEOUT_MS).unref();
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error.message);

    if (server) {
      server.close();
    }

    process.exit(1);
  }
};

bootstrap();
