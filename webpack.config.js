const config = require( './node_modules/@wordpress/scripts/config/webpack.config.js' );

const path = require( 'path' );

const MiniCssExtractPlugin = require( 'mini-css-extract-plugin' );

config.module = config.module || {};
config.module.rules = [
	...( config.module.rules || [] ),
	{
		test: /\.s?css$/,
		use: [
			{
				loader: MiniCssExtractPlugin.loader,
				options: {
					hmr: process.env.NODE_ENV === 'development',
				},
			},
			'css-loader',
			{
				loader: 'sass-loader',
				options: {
					webpackImporter: false,
					sassOptions: {
						includePaths: [
							path.resolve( __dirname, 'node_modules' ),
						],
						outputStyle: 'production' === process.env.NODE_ENV ? 'compressed' : 'nested',
					},
				},
			},
		],
	},
];

config.plugins = [
	...( config.plugins || [] ),
	new MiniCssExtractPlugin( {
		filename: './style.css',
	} ),
];

module.exports = config;
