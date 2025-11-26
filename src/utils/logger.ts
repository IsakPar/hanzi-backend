type LogLevel = 'info' | 'warn' | 'error';

const logAtLevel = (level: LogLevel, payload: Record<string, unknown>) => {
  const message = JSON.stringify(payload);
  switch (level) {
    case 'info':
      console.info(message);
      break;
    case 'warn':
      console.warn(message);
      break;
    case 'error':
      console.error(message);
      break;
  }
};

export const logWithContext = (
  level: LogLevel,
  message: string,
  options?: {
    requestId?: string;
    meta?: Record<string, unknown>;
  }
) => {
  const payload: Record<string, unknown> = {
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  if (options?.requestId) {
    payload.requestId = options.requestId;
  }

  if (options?.meta) {
    payload.meta = options.meta;
  }

  logAtLevel(level, payload);
};

