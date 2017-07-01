/*eslint-env node*/

var path = require('path'),
  webpack = require('webpack');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  entry: {
    app: './webapp',
    vendor: ['react', 'react-dom']
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
  resolve: {
    modules: [path.resolve('node_modules'), path.resolve('webapp')],
    extensions: ['*', '.jsx', '.js', '.json']
  },
  output: {
    path: path.resolve('webapp/dist'),
    filename: '[name].bundle.js'
  },
  devtool: 'source-map'
};
