import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info', // Puedes controlar el nivel de logs con una variable de entorno
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: true,
      ignore: 'pid,hostname',
    },
  } : undefined,
});

export default logger;
