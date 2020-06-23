import { DefinePlugin, HashedModuleIdsPlugin } from 'webpack';
import InjectPlugin, { ENTRY_ORDER }           from 'webpack-inject-plugin';

import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { VueLoaderPlugin }    from 'vue-loader';

import HtmlWebpackPlugin      from 'html-webpack-plugin';
import InlineSourcePlugin     from 'html-webpack-inline-source-plugin';

import DotenvWebpackPlugin    from 'dotenv-webpack';
import path                   from 'path';

const rootPath = (...paths) => path.join(__dirname, ...paths);
const srcPath  = (...paths) => rootPath('src',      ...paths);

const browserslist =
    '>0.4%, last 1 version and not dead and >0.2%, not IE 11';

const config = mode => ({
    entry: srcPath('index.js'),

    optimization: {
        splitChunks : { chunks: 'all' }, runtimeChunk: 'single'
    },

    output: {
        path: rootPath('dist'), filename: mode === 'development' ?
            '[name].[hash].js' : '[name].[chunkhash].js'
    },

    resolve: {
        extensions: [ '.js', '.vue' ], alias: {
            'vue$': 'vue/dist/vue.esm.js',
            'component': srcPath('component'), 'store': srcPath('store')
        }
    },

    module: {
        rules: [{
            test: /\.js$/, loader: 'babel-loader', include: srcPath(),

            options: { presets: [[ '@babel/preset-env', {
                modules    : false,   targets: browserslist,
                useBuiltIns: 'usage', corejs : 'core-js@3'

            } ]], babelrc: false } // override config in package.json
        }, {
            test: /\.vue$/, loader: 'vue-loader'
        }, {
            test: /\.css$/, use: [ 'vue-style-loader', 'css-loader' ]
        }],
        noParse: /gun\/(gun|sea|axe)\.js$/ // see https://git.io/Jv2K2
    },

    plugins: [
        new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
        new DefinePlugin({ 'process.env': { MODE: JSON.stringify(mode) } }),

        new DotenvWebpackPlugin(), new VueLoaderPlugin(),

        new HtmlWebpackPlugin({
            template: srcPath('index.html'), inlineSource: 'runtime.+\\.js'
        }),
        new InlineSourcePlugin(HtmlWebpackPlugin), // see https://git.io/JfxVw
        new HashedModuleIdsPlugin(),

        ...(mode === 'development' ? [ // suppress log spam from modules

            new InjectPlugin(() => `console.blg=console['log'];
                console['log']=()=>{};`, { entryOrder: ENTRY_ORDER.NotLast }),

            new InjectPlugin(() => `console['log']=console.blg;
                delete console.blg;`, { entryOrder: ENTRY_ORDER.Last }) ] : [])
    ],

    ...(mode === 'development' ? { // configure dev server

        devServer: { contentBase: false, compress: true },
        devtool: 'cheap-module-eval-source-map' } : {}),
});

module.exports = (env, argv) => {
    console.log('\x1b[33m', `webpack - ${ argv.mode }`, '\x1b[0m\n');
    return config(argv.mode);
};
