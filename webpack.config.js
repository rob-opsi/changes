/*eslint-env node*/

var path = require('path');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var LodashModuleReplacementPlugin = require('lodash-webpack-plugin');
var IS_PRODUCTION = process.env.NODE_ENV === 'production';

module.exports = {
  entry: {
    app: './webapp'
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader'
      },
      {
        test: /\.json$/,
        loader: 'json-loader'
      },
      {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'less-loader']
        })
      },
      {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader'
        })
      },
      // inline base64 URLs for <=8k images, direct URLs for the rest
      {
        test: /\.(png|jpg)$/,
        loader: 'url-loader?limit=8192'
      }
    ]
  },
  plugins: [new LodashModuleReplacementPlugin()],
  resolve: {
    modules: [path.resolve('node_modules'), path.resolve('webapp')],
    extensions: ['*', '.jsx', '.js', '.json']
  },
  output: {
    path: path.resolve('webapp/dist'),
    filename: '[name].bundle.js'
  },
  devtool: IS_PRODUCTION ? '#source-map' : '#cheap-source-map'
};
