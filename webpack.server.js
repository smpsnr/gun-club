const path          = require('path');
const nodeExternals = require('webpack-node-externals');

const rootPath = (...paths) => path.join(__dirname, ...paths);
const srcPath  = (...paths) => rootPath('src',      ...paths);

module.exports = {
    target   : 'node',
    externals: [ nodeExternals() ],

    entry: { main: srcPath('api', 'gun-server.js') },
    node : { __dirname: false },

    output: {
        path: rootPath('dist', 'server'),
        filename: 'gun-server.js'
    },

    module: {
        rules: [{
            test: /\.js$/, loader: 'babel-loader',
            include: [ srcPath() ],

            options: {
                presets: [[ '@babel/preset-env', {
                    targets: { node: 'current' }
                } ]]
            }
        }]
    }
};
