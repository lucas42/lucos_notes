import { URL } from 'url';
export default {
  entry: {
    client: './client/index.js',
    serviceworker: './client/service-worker/index.js',
  },
  output: {
    filename: '[name].js',
    path: new URL('./static/', import.meta.url).pathname,
  },
  mode: 'production',
};