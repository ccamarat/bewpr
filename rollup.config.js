import babel from 'rollup-plugin-babel';

export default {
    entry: 'src/index.js',
    format: 'iife',
    dest: 'dist/chatr.js',
    moduleName: 'chatr',
    plugins: [
        babel({
            exclude: 'node_modules/**' // only transpile our source code
        })
    ]
};
