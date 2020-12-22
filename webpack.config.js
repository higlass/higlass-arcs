/* eslint-env node */
const path = require('path');

const HtmlWebPackPlugin = require('html-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'higlass-arcs.min.js',
    library: 'higlass-arcs',
    libraryTarget: 'umd',
    path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
    contentBase: [path.join(__dirname, 'node_modules/higlass/dist')],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()],
  },
  module: {
    rules: [
      // Run ESLint first
      {
        enforce: 'pre',
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'eslint-loader',
        },
      },
      // Transpile the ESD6 files to ES5
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js', '.css', '.fs', '.vs'],
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: './src/index.html',
    }),
  ],
};
