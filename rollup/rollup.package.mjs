import { basePlugins, createTypeScriptPlugin, externalPackages } from './rollup.base.mjs';
import dts from 'rollup-plugin-dts';

export function createPackageConfig(input, external = []) {
  const jsConfig = {
    input,
    external: [...externalPackages, ...external],
    output: [
      {
        file: 'dist/index.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/index.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named'
      }
    ],
    plugins: [
      ...basePlugins,
      createTypeScriptPlugin()
    ]
  };

  // Type definitions bundling
  const typesInput = input.replace('src/', 'dist/types/').replace('.ts', '.d.ts');
  const dtsConfig = {
    input: typesInput,
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    external: [...externalPackages, ...external],
    plugins: [
      dts({
        respectExternal: true,
        compilerOptions: {
          preserveComments: true
        }
      })
    ]
  };

  return [jsConfig, dtsConfig];
}
