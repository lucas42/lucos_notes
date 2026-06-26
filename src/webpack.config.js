import { URL } from 'url';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import { hashElement } from 'folder-hash';
export default async () => {
	return {
		entry: {
			client: './client/index.js',
			serviceworker: './service-worker/index.js',
		},
		output: {
			filename: '[name].js',
			path: new URL('./resources/', import.meta.url).pathname,
		},
		plugins: [
			// Get the hashes of all the resources, templates, and dependencies to embed in a comment in service worker.
			// Dependency Hash covers package-lock.json so that a dependency-only change produces a different
			// serviceworker.js and triggers a browser SW update.
			new webpack.BannerPlugin({
				banner: `Resource Hash: ${(await hashElement("./resources")).hash}\nClient JS Hash: ${(await hashElement("./client")).hash}\nTemplate Hash: ${(await hashElement("./templates")).hash}\nDependency Hash: ${(await hashElement("./package-lock.json")).hash}`,
				include: 'serviceworker',
			}),
		],
		optimization: {
			// Stop the terser plugin messing with the banner plugin
			minimizer: [new TerserPlugin({
				extractComments: false,
			})],
		},
		mode: 'production',
	};
};