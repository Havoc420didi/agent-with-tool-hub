import winston from 'winston';
import path from 'path';
import DailyRotateFile from 'winston-daily-rotate-file';
import fs from 'fs';

// 扩展 Logger 类型以包含 realtime 方法
declare module 'winston' {
  interface Logger {
    realtime: (level: string, message: string) => void;
  }
}

// 确保日志目录存在
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 日志级别配置
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 日志颜色配置
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(logColors);

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
);

// 文件日志格式（不包含颜色）
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`),
);

// 创建日志传输器
const transports = [
  // 控制台输出
  new winston.transports.Console({
    format: logFormat,
    handleExceptions: true,
    handleRejections: true,
    stderrLevels: ['error'],
    consoleWarnLevels: ['warn'],
    silent: false,
    level: 'debug'
  }),
  // 错误日志文件 - 按天分割
  new DailyRotateFile({
    filename: path.join('logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: fileLogFormat,
    handleExceptions: true,
    maxSize: '20m',
    maxFiles: '30d',
    zippedArchive: true,
  }),
  // 所有日志文件 - 按天分割
  new DailyRotateFile({
    filename: path.join('logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: fileLogFormat,
    handleExceptions: true,
    handleRejections: true,
    maxSize: '50m',
    maxFiles: '30d',
    zippedArchive: true,
  }),
  // 应用日志文件 - 按天分割
  new DailyRotateFile({
    filename: path.join('logs', 'app-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    format: fileLogFormat,
    maxSize: '50m',
    maxFiles: '30d',
    zippedArchive: true,
  }),
];

// 创建 logger 实例
const Logger = winston.createLogger({
  level: 'debug',
  levels: logLevels,
  transports,
});

// 确保在所有环境下控制台都能显示日志
if (process.env.NODE_ENV === 'production') {
  Logger.transports.forEach((transport) => {
    if (transport instanceof winston.transports.Console) {
      transport.level = 'info';
    }
  });
}

// 添加实时日志输出方法
Logger.realtime = (level: string, message: string) => {
  Logger.log(level, message);
  
  if (process.stdout.isTTY) {
    process.stdout.write(`[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}\n`);
  }
};

export default Logger;
