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

const config = (local, sw, mode) => ({
    devtool: mode === 'production' ? undefined : 'cheap-module-eval-source-map',

    entry: {
        main: srcPath('index.js')
    },

    output: {
        path: rootPath(mode === 'production'
            ? 'dist'                  : 'dist-dev'),

        filename:      mode === 'production'
            ? '[name].[chunkhash].js' : '[name].[hash].js',

        publicPath: '/'
    },

    optimization: {
        splitChunks : { chunks: 'all' },
        runtimeChunk: true
    },

    node: {
        fs: 'empty', net: 'empty', tls: 'empty'
    },

    resolve: {
        extensions: [ '.js', '.vue' ],
        alias     : {
            'vue$' : 'vue/dist/vue.esm.js',

            'api'  : srcPath('api'), 'model': srcPath('model'),
            'store': srcPath('store'),
        },
    },

    module : {
        rules: [{
            test   : /\.vue$/, loader: 'vue-loader',

        }, {
            test   : /\.js$/,  loader: 'babel-loader',
            include: [ srcPath() ],

            options: {
                presets: [[ '@babel/preset-env', {
                    modules: false, useBuiltIns: 'usage', corejs: 'core-js@3'
                } ]],
                plugins: [[ '@babel/plugin-proposal-class-properties' ]]
            }

        }, {
            test:  /\.(css|scss)$/,
            use : [ 'vue-style-loader', 'css-loader' ]
        }],

        noParse: /node_modules\/gun\/(gun|sea)\.js$/ // see https://git.io/Jv2K2
    },

    plugins: [
        ...(local ? [ // dev server only
            new CleanWebpackPlugin() ] : []),

        new DotenvWebpackPlugin(),
        new VueLoaderPlugin(),

        new HtmlWebpackPlugin({
            template    : srcPath('index.html'),
            inlineSource: 'runtime~.+\\.js',
        }),

        new InlineSourcePlugin(),
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
    let sw    = env && env.includes('sw');

    console.log('\x1b[33m', `configuring webpack for ${ argv.mode }`,
                `${ local ? 'on local server'     : '' }`,
                `${ sw    ? 'with service worker' : '' }`, '\x1b[0m\n');

    return config(local, sw, argv.mode);
};
