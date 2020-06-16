const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const DotenvWebpackPlugin    = require('dotenv-webpack');

const InjectPlugin           = require('webpack-inject-plugin').default;
const ENTRY_ORDER            = require('webpack-inject-plugin').ENTRY_ORDER;

const path                   = require('path');
const nodeExternals          = require('webpack-node-externals');

const webpack                = require('webpack');

const rootPath = (...paths) => path.join(__dirname, ...paths);
const srcPath  = (...paths) => rootPath('server',   ...paths);

const config = mode => ({
    target   : 'node',
    externals: [ nodeExternals() ],

    /* devtool: mode === 'production'
        ? undefined : 'cheap-module-eval-source-map', */

    entry: {
        main: srcPath('gun-server.js')
    },

    output: {
        path: rootPath(mode === 'production'
            ? 'dist'                  : 'dist-dev'),

        filename     : 'gun-server.js',
        libraryTarget: 'commonjs2'
    },

    /* optimization: {
        splitChunks : { chunks: 'all' },
        runtimeChunk: true
    }, */

    module: {
        rules: [{
            test   : /\.js$/, loader: 'babel-loader',
            include: [ srcPath() ],

            options: {
                presets: [[ '@babel/preset-env', {
                    'modules': 'commonjs'
                } ]],

                plugins: [ '@babel/plugin-transform-runtime' ]
            }
        }]
    },

    plugins: [
        new CleanWebpackPlugin(),

        new webpack.DefinePlugin({
            'process.env': { MODE: JSON.stringify(mode) }
        }),

        new DotenvWebpackPlugin(),
        new webpack.HashedModuleIdsPlugin(),

        /* new InjectPlugin(() => `
            window.cvclnk_log = window.console['log'];
            window.console['log'] = () => {};`, { entryOrder: ENTRY_ORDER.NotLast }),

        new InjectPlugin(() => `
            window.console["log"] = window.cvclnk_log;
            delete window.cvclnk_log;`, { entryOrder: ENTRY_ORDER.Last }) */
    ]
});

module.exports = (env, argv) => {
    console.log('\x1b[33m', `configuring webpack for ${ argv.mode }`, '\x1b[0m\n');
    return config(argv.mode);
};
