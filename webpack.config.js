const path = require('path');

const rootPath = (...paths) => path.join(__dirname, ...paths);
const srcPath  = (...paths) => rootPath('src',      ...paths);

const config = mode => ({
    devtool: mode === 'production' ? undefined : 'cheap-module-eval-source-map',
    externals: /gun\//, // make gun a peer dependency

    node:  { fs: 'empty', net: 'empty', tls: 'empty' },
    entry: { main: srcPath('module.mjs') },

    output: {
        path: rootPath('dist'), filename: 'browser.js',
        libraryTarget: 'umd',   library : 'gun-club', globalObject: 'this'
    },

    module: {
        rules: [{
            test: /\.m?js$/, include: [ srcPath() ],
            loader: 'babel-loader',
            options: {
                presets: [[ '@babel/preset-env', { modules: false } ]],
                plugins: [  '@babel/plugin-transform-runtime' ]
            }
        }]
    }
});

module.exports = (env, argv) => config(argv.mode);
