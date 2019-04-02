import babel from 'rollup-plugin-babel';

const pkg = require('./package.json');

export default {
  input: 'src/index.js',
  plugins: [
    babel({
      exclude: 'node_modules/**'
    })
  ],
  output: [
    {
      file: pkg.main,
      format: 'umd',
      name: 'bewpr',
      sourcemap: true
    },
    {
      file: pkg.module,
      format: 'es',
      sourcemap: true
    }
  ]
};
