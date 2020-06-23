const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { VueLoaderPlugin }    = require('vue-loader');

const DotenvWebpackPlugin    = require('dotenv-webpack');

const HtmlWebpackPlugin      = require('html-webpack-plugin');
const InlineSourcePlugin     = require('html-webpack-inline-source-plugin');

const InjectPlugin           = require('webpack-inject-plugin').default;
const ENTRY_ORDER            = require('webpack-inject-plugin').ENTRY_ORDER;

const path                   = require('path');
const webpack                = require('webpack');

const rootPath = (...paths) => path.join(__dirname, ...paths);
const srcPath  = (...paths) => rootPath('src',      ...paths);

const config = (local, mode) => ({
    entry: srcPath('index.js'),

    devtool: mode === 'production' ?
        undefined : 'cheap-module-eval-source-map',

    optimization: {
        splitChunks : { chunks: 'all' }, runtimeChunk: 'single'
    },

    output: {
        path: rootPath('dist'), filename: mode === 'production' ?
            '[name].[chunkhash].js' : '[name].[hash].js'
    },

    node: {
        fs: 'empty', net: 'empty', tls: 'empty'
    },

    resolve: {
        extensions: [ '.js', '.vue' ],
        alias     : {
            'vue$': 'vue/dist/vue.esm.js',

            'component': srcPath('component'),
            'store'    : srcPath('store')
        },
    },

    module : {
        rules: [{
            test   : /\.vue$/, loader: 'vue-loader',

        }, {
            test   : /\.js$/,  loader: 'babel-loader',
            include: [ srcPath() ],

            options: { presets: [[ '@babel/preset-env', {
                modules: false, useBuiltIns: 'usage', corejs: 'core-js@3'
            } ]] }

        }, {
            test:  /\.css$/,
            use : [ 'vue-style-loader', 'css-loader' ]
        }],

        noParse: /node_modules\/gun\/(gun|sea|axe)\.js$/ // see https://git.io/Jv2K2
    },

    plugins: [
        ...(local ? [ // dev server only
            new CleanWebpackPlugin() ] : []),

        new webpack.DefinePlugin({
            'process.env': { MODE: JSON.stringify(mode) }
        }),

        new DotenvWebpackPlugin(),
        new VueLoaderPlugin(),

        new HtmlWebpackPlugin({
            template: srcPath('index.html'),
            inlineSource: 'runtime.+\\.js'
        }),

        new InlineSourcePlugin(HtmlWebpackPlugin), // https://git.io/JfxVw
        new webpack.HashedModuleIdsPlugin(),

        // suppress log spam from modules

        new InjectPlugin(() => `
            window.cvclnk_log = window.console['log'];
            window.console['log'] = () => {};`, { entryOrder: ENTRY_ORDER.NotLast }),

        new InjectPlugin(() => `
            window.console["log"] = window.cvclnk_log;
            delete window.cvclnk_log;`, { entryOrder: ENTRY_ORDER.Last })
    ]
});

module.exports = (env, argv) => {
    let local = env && env.includes('local');

    console.log('\x1b[33m', `configuring webpack for ${ argv.mode }`,
                `${ local ? 'on local server'     : '' }`, '\x1b[0m\n');

    return config(local, argv.mode);
};
