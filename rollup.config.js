import babel    from '@rollup/plugin-babel';

import resolve  from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

const browserslist =
    '>0.4%, last 1 version and not dead and >0.2%, not IE 11';

export default {
    external: /gun\//,

    output: [{
        format: 'umd', name: 'gun-club',
        globals: { 'gun/gun.js': 'Gun' }
    }],

    plugins: [
        resolve({ browser: true }),

        commonjs({
            include: /node_modules/, transformMixedEsModules: true,
            dynamicRequireTargets: [ '**/axe.js', '**/webrtc.js' ]
        }),

        babel({
            include     : /src/,
            babelHelpers: 'runtime',

            presets: [[ '@babel/preset-env', {
                modules    : false,   targets: browserslist,
                useBuiltIns: 'usage', corejs : 'core-js@3'

            } ]], plugins: [ '@babel/plugin-transform-runtime' ]
        })
    ]
};
