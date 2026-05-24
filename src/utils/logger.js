const isProd = process.env.NODE_ENV === 'production';

function log(level, message, meta = {}) {
  const entry = JSON.stringify({ level, message, ...meta, ts: new Date().toISOString() });
  if (level === 'error') {
    process.stderr.write(entry + '\n');
  } else {
    process.stdout.write(entry + '\n');
  }
}

const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};

export default logger;
export { isProd };
