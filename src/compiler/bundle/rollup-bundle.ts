import { BuildCtx, CompilerCtx, Config, EntryModule, RollupBundle } from '../../declarations';
import bundleEntryFile from './rollup-plugins/bundle-entry-file';
import { createOnWarnFn, loadRollupDiagnostics } from '../../util/logger/logger-rollup';
import { generatePreamble, hasError } from '../util';
import { getBundleIdPlaceholder } from '../../util/data-serialize';
import localResolution from './rollup-plugins/local-resolution';
import transpiledInMemoryPlugin from './rollup-plugins/transpiled-in-memory';
import nodeEnvVars from './rollup-plugins/node-env-vars';


export async function runRollup(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx, entryModule: EntryModule) {
  let rollupBundle: RollupBundle;

  try {
    rollupBundle = await config.sys.rollup.rollup({
      input: entryModule.entryKey,
      cache: compilerCtx.rollupCache[entryModule.entryKey],
      plugins: [
        config.sys.rollup.plugins.nodeResolve({
          jsnext: true,
          main: true
        }),
        config.sys.rollup.plugins.commonjs({
          include: 'node_modules/**',
          sourceMap: false
        }),
        bundleEntryFile(entryModule),
        transpiledInMemoryPlugin(config, compilerCtx),
        localResolution(config, compilerCtx),
        nodeEnvVars(config),
      ],
      onwarn: createOnWarnFn(buildCtx.diagnostics, entryModule.moduleFiles)

    });

  } catch (err) {
    loadRollupDiagnostics(config, compilerCtx, buildCtx, err);
  }

  if (hasError(buildCtx.diagnostics) || !rollupBundle) {
    throw new Error('rollup died');
  }

  // cache for later
  // watch out for any rollup cache bugs
  // https://github.com/rollup/rollup/issues/1372
  compilerCtx.rollupCache[entryModule.entryKey] = rollupBundle;

  return rollupBundle;
}


export async function generateEsModule(config: Config, rollupBundle: RollupBundle) {
  const { code } = await rollupBundle.generate({
    format: 'es',
    banner: generatePreamble(config),
    intro: `const { h, Context } = window.${config.namespace};`
  });

  return code;
}


export async function generateLegacyModule(config: Config, rollupBundle: RollupBundle) {
  const { code } = await rollupBundle.generate({
    format: 'cjs',
    banner: generatePreamble(config),
    intro: `${config.namespace}.loadComponents(function(exports,h,Context){` +
           `"use strict";`,
            // module content w/ commonjs exports object
    outro: `\n},"${getBundleIdPlaceholder()}");`,
    strict: false
  });

  return code;
}
