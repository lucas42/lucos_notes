import { URL } from 'url';
export default {
  entry: {
    client: './client/index.js',
    serviceworker: './service-worker/index.js',
  },
  output: {
    filename: '[name].js',
    path: new URL('./resources/', import.meta.url).pathname,
  },
  mode: 'production',
};