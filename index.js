var glob = require("glob");
var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
var UglifyJSPlugin = require('uglifyjs-webpack-plugin');
var ExtractTextPlugin = require('extract-text-webpack-plugin');
var HardSourceWebpackPlugin = require('hard-source-webpack-plugin');
var fs = require('fs-extra');
var rootPath = path.resolve(__dirname, '../../');
var Config = require(path.resolve(rootPath, './src/config.js'));
var assets_directory = path.resolve(rootPath, './src/assets/');

// Generate Module routes.ts
modulesPath = "./src/modules";
moduleRoutes = path.join(path.resolve(modulesPath));
routesFile = './src/routes.ts';
routesFileText = "";
var importNames = [];
var stream = fs.createWriteStream(routesFile);
for (let folder of fs.readdirSync(path.resolve(modulesPath)))
{
    if (fs.statSync(path.join(path.resolve(modulesPath), folder)).isDirectory())
    {
        moduleRoutesName = folder + 'Routes';
        importNames.push(moduleRoutesName);
        stream.write("import " + moduleRoutesName + " from \"./modules/" + folder + "/routes\";\n");
    }
}
stream.write("export default [].concat(\n");
counter = 0;
for (let importName of importNames)
{
    counter++;
    if (counter === importNames.length)
    {
        stream.write(importName + "\n");
    } else
    {
        stream.write(importName + ",\n");
    }
}
stream.write(");");
stream.end();

module.exports = {
  context: rootPath,
  entry: ['./src/boot.ts'].concat(
    glob.sync("**/entry.scss", { absolute: true, cwd: path.resolve("./src/") })
  ),
  output: {
    path: path.resolve(rootPath, './dist/'),
    filename: 'boot.js',
    publicPath: '/'
  },
  plugins: [
      new HardSourceWebpackPlugin(),
      new CopyWebpackPlugin([
          { from: assets_directory + '/js/', to: './assets/js/' },
          { from: assets_directory + '/css/', to: './assets/css/' },
          { from: assets_directory + '/images/', to: './assets/images/' },
          { from: assets_directory + '/fonts/', to: './assets/fonts/' }
      ]),
      new ExtractTextPlugin({
          filename: 'assets/css/sassy.css',
          allChunks: true,
      }),
      new HtmlWebpackPlugin({
          filename: 'index.html',
          template: './src/index.html',
          minify: {
              collapseWhitespace: true,
              removeComments: true,
              removeRedundantAttributes: true,
              removeScriptTypeAttributes: true,
              removeStyleLinkTypeAttributes: true
          }
      }),
      new HtmlWebpackIncludeAssetsPlugin({
          publicPath: '/assets/css/',
          assets: glob.sync("*.css", { cwd: path.resolve("./src/assets/css/") }),
          append: false
      }),
      new HtmlWebpackIncludeAssetsPlugin({
          publicPath: '/assets/js/',
          assets: glob.sync("*.js", { cwd: path.resolve("./src/assets/js/") }),
          append: false
      }),
      new webpack.DefinePlugin({
          'process.env': {
              //set to development(adds vuejs debugging) or production (remove vuejs debugging)
              NODE_ENV: (Config.debug) ? 'development' : 'production'
          }
      }),
      new webpack.optimize.UglifyJsPlugin({
          sourceMap: (Config.debug) ? false : true,
          compress:
          {
              warnings: false
          }
      })
  ],
  module: {
      rules: [
          {
              test: /\.(scss)$/,
              use: ExtractTextPlugin.extract({
                  fallback: 'style-loader',
                  use: ['css-loader','sass-loader'],
                  publicPath: "/",
              })
          },
          {
              test: /\.ts$/,
              loader: 'ts-loader'
          },
          {
              test: /\.vue$/,
              loader: 'vue-loader'
          },
          {
              test: /\.(woff|woff2|eot|ttf)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
              loader: 'url-loader'
          },
          {
              test: /\.(png|jpg|gif|svg)$/,
              loader: 'file-loader',
              options:
              {
                  name: function(file){
                    var pathComponents = file.split(path.sep);
                    if(pathComponents.indexOf("modules") > -1)
                    {
                        var moduleName = pathComponents[pathComponents.length - 4];
                        var filename = pathComponents[pathComponents.length - 1];
                        fs.copySync(path.resolve('./src/modules/'+moduleName+'/assets/images/'+filename), './dist/assets/images/modules/'+moduleName+'/'+filename);
                        return 'images/modules/'+moduleName+'/[name].[ext]?[hash]';
                    }
                    return 'images/[name].[ext]?[hash]';
                  },
                  publicPath: '/assets/',
                  emitFile: false
              },
          }
    ]
  },
  resolve: {
      alias: {
        'vue$': 'vue/dist/vue.esm.js'
      },
    extensions: ['.js', '.ts', '.png', '.scss', '.vue']
  },
  externals: {
      jquery: 'jQuery',
  },
  devServer: {
    historyApiFallback: true,
    noInfo: true
  },
  performance: {
    hints: false
  },
  devtool: '#source-map'
}