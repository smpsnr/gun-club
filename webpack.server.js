const path                   = require('path');
const nodeExternals          = require('webpack-node-externals');

const rootPath = (...paths) => path.join(__dirname, ...paths);
const srcPath  = (...paths) => rootPath('server',   ...paths);

const config = mode => ({
    target   : 'node',
    externals: [ nodeExternals() ],

    entry: { main: srcPath('gun-server.js') },
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
});

module.exports = (env, argv) => {
    console.log('\x1b[33m',
                `configuring webpack for ${ argv.mode }`, '\x1b[0m\n');

    return config(argv.mode);
};
