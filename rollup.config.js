import babel from 'rollup-plugin-babel';

export default {
    entry: 'src/index.js',
    format: 'iife',
    dest: 'dist/bewpr.js',
    moduleName: 'bewpr',
    sourceMap: true,
    plugins: [
        babel({
            exclude: 'node_modules/**' // only transpile our source code
        })
    ]
};
