import dts from 'rollup-plugin-dts';

export function createTypesConfig(input) {
  return {
    input,
    output: {
      file: 'dist/index.d.ts',
      format: 'es'
    },
    plugins: [
      dts({
        respectExternal: true,
        compilerOptions: {
          preserveComments: true
        }
      })
    ]
  };
}
