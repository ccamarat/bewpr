import babel from 'rollup-plugin-babel';
import babelrc from 'babelrc-rollup';

const pkg = require('./package.json');

export default {
    entry: 'src/index.js',
    plugins: [
        babel(babelrc())
    ],
    targets: [
        {
            dest: pkg.main,
            format: 'umd',
            moduleName: 'bewpr',
            sourceMap: true
        },
        {
            dest: pkg.module,
            format: 'es',
            sourceMap: true
        }
    ]
};
