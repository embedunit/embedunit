import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';

const basePlugins = [
  resolve({ browser: true, preferBuiltins: false }),
  commonjs({ include: /node_modules/, transformMixedEsModules: true }),
  typescript({ tsconfig: './tsconfig.json', useTsconfigDeclarationDir: false, clean: true }),
  replace({
    preventAssignment: true,
    values: {
      'process.env.NODE_ENV': '"production"',
      'process.env': '{}',
      'process.platform': '"browser"'
    }
  })
];

function createBundle(input, outputName) {
  return [
    {
      input,
      output: {
        file: `dist/${outputName}.js`,
        format: 'iife',
        name: 'EmbedUnit',
        sourcemap: true,
        exports: 'default'
      },
      plugins: basePlugins
    },
    {
      input,
      output: {
        file: `dist/${outputName}.min.js`,
        format: 'iife',
        name: 'EmbedUnit',
        sourcemap: true,
        exports: 'default'
      },
      plugins: [...basePlugins, terser()]
    }
  ];
}

export default [
  ...createBundle('src/recommended.ts', 'embedunit.recommended.global'),
  ...createBundle('src/recommended-globals.ts', 'embedunit.recommended.globals'),
  ...createBundle('src/lite.ts', 'embedunit.lite.global')
];
