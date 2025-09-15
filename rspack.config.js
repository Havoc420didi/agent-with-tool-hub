import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: {
    main: './src/main.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
    chunkFormat: 'module'
  },
  target: 'node',
  mode: 'development',
  resolve: {
    extensions: ['.ts', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                decorators: true
              },
              transform: {
                decoratorMetadata: true
              }
            }
          }
        },
        exclude: /node_modules/
      }
    ]
  },
  optimization: {
    minimize: false
  },
  externals: {
    // 外部化 Node.js 内置模块
    'tty': 'commonjs tty',
    'fs': 'commonjs fs',
    'path': 'commonjs path',
    'url': 'commonjs url',
    'util': 'commonjs util',
    'crypto': 'commonjs crypto',
    'stream': 'commonjs stream',
    'events': 'commonjs events',
    'os': 'commonjs os',
    'child_process': 'commonjs child_process',
    'http': 'commonjs http',
    'https': 'commonjs https',
    'net': 'commonjs net',
    'zlib': 'commonjs zlib',
    'querystring': 'commonjs querystring',
    'readline': 'commonjs readline',
    'repl': 'commonjs repl',
    'vm': 'commonjs vm',
    'cluster': 'commonjs cluster',
    'worker_threads': 'commonjs worker_threads',
    'perf_hooks': 'commonjs perf_hooks',
    'async_hooks': 'commonjs async_hooks',
    'buffer': 'commonjs buffer',
    'process': 'commonjs process',
    'console': 'commonjs console',
    'timers': 'commonjs timers',
    'punycode': 'commonjs punycode',
    'string_decoder': 'commonjs string_decoder',
    'tls': 'commonjs tls',
    'dgram': 'commonjs dgram',
    'dns': 'commonjs dns',
    'assert': 'commonjs assert',
    'constants': 'commonjs constants',
    'domain': 'commonjs domain',
    'module': 'commonjs module',
    'sys': 'commonjs sys',
    'v8': 'commonjs v8',
    'inspector': 'commonjs inspector',
    'trace_events': 'commonjs trace_events'
  }
}
