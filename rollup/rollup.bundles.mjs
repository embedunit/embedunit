import { basePlugins, createTypeScriptPlugin } from './rollup.base.mjs';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';

export function createBundleConfig(input, name, globalName) {
  const base = {
    input,
    output: {
      file: `dist/${name}.js`,
      format: 'iife',
      name: globalName,
      sourcemap: true,
      exports: 'default'
    },
    plugins: [
      ...basePlugins,
      createTypeScriptPlugin(),
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': '"production"',
          'process.env': '{}',
          'process.platform': '"browser"'
        }
      })
    ]
  };

  const minified = {
    ...base,
    output: {
      ...base.output,
      file: `dist/${name}.min.js`
    },
    plugins: [...base.plugins, terser()]
  };

  return [base, minified];
}
