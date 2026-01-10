import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';

export const basePlugins = [
  resolve({ browser: true, preferBuiltins: false }),
  commonjs({ include: /node_modules/, transformMixedEsModules: true }),
];

export function createTypeScriptPlugin(tsconfig = './tsconfig.json') {
  return typescript({
    tsconfig,
    useTsconfigDeclarationDir: true,
    clean: true
  });
}

export const externalPackages = [
  '@embedunit/core',
  '@embedunit/assert',
  '@embedunit/spy',
  '@embedunit/globals',
  '@embedunit/reporters-minimal',
  '@embedunit/preset-recommended',
  'source-map-js'
];
