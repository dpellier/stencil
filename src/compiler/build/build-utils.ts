import { BuildBundle, BuildCtx, BuildEntry, BuildResults, CompilerCtx, Config, WatcherResults } from '../../declarations';
import { catchError, hasError, pathJoin } from '../util';
import { cleanDiagnostics } from '../../util/logger/logger-util';
import { initWatcher } from '../watcher/watcher-init';
import { DEFAULT_STYLE_MODE } from '../../util/constants';


export function getBuildContext(config: Config, compilerCtx: CompilerCtx, watcher: WatcherResults) {
  // do a full build if there is no watcher
  // or the watcher said the config has updated
  const requiresFullBuild = !watcher || watcher.configUpdated;

  const isRebuild = !!watcher;
  compilerCtx.isRebuild = isRebuild;

  const msg = `${isRebuild ? 'rebuild' : 'build'}, ${config.fsNamespace}, ${config.devMode ? 'dev' : 'prod'} mode, started`;

  // increment the active build id
  compilerCtx.activeBuildId++;

  // data for one build
  const buildCtx: BuildCtx = {
    requiresFullBuild: requiresFullBuild,
    buildId: compilerCtx.activeBuildId,
    diagnostics: [],
    entryPoints: [],
    entryModules: [],
    moduleFiles: [],
    transpileBuildCount: 0,
    bundleBuildCount: 0,
    appFileBuildCount: 0,
    indexBuildCount: 0,
    aborted: false,
    startTime: Date.now(),
    timeSpan: config.logger.createTimeSpan(msg),
    hasChangedJsText: false,
    filesWritten: [],
    filesChanged: watcher ? watcher.filesChanged : [],
    filesUpdated: watcher ? watcher.filesUpdated : [],
    filesAdded: watcher ? watcher.filesAdded : [],
    filesDeleted: watcher ? watcher.filesDeleted : [],
    dirsDeleted: watcher ? watcher.dirsDeleted : [],
    dirsAdded: watcher ? watcher.dirsAdded : []
  };

  buildCtx.shouldAbort = () => {
    return shouldAbort(compilerCtx, buildCtx);
  };

  buildCtx.finish = () => {
    try {
      // setup watcher if need be
      initWatcher(config, compilerCtx, buildCtx);
    } catch (e) {
      catchError(buildCtx.diagnostics, e);
    }

    return finishBuild(config, compilerCtx, buildCtx);
  };

  return buildCtx;
}


function finishBuild(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  const buildResults = generateBuildResults(config, compilerCtx, buildCtx);

  // log any errors/warnings
  config.logger.printDiagnostics(buildResults.diagnostics);

  // create a nice pretty message stating what happend
  const buildText = compilerCtx.isRebuild ? 'rebuild' : 'build';
  let watchText = config.watch ? ', watching for changes...' : '';
  let buildStatus = 'finished';
  let statusColor = 'green';
  let bold = true;

  if (buildResults.hasError) {
    compilerCtx.lastBuildHadError = true;
    buildStatus = 'failed';
    statusColor = 'red';

  } else if (buildResults.aborted) {
    buildStatus = 'aborted';
    watchText = '';
    statusColor = 'dim';
    bold = false;

  } else {
    compilerCtx.hasSuccessfulBuild = true;
    compilerCtx.lastBuildHadError = false;
  }

  // print out the time it took to build
  // and add the duration to the build results
  buildCtx.timeSpan.finish(`${buildText} ${buildStatus}${watchText}`, statusColor, bold, true);

  // clear it all out for good measure
  for (const k in buildCtx) {
    (buildCtx as any)[k] = null;
  }

  // write all of our logs to disk if config'd to do so
  config.logger.writeLogs(compilerCtx.isRebuild, buildResults);

  // emit a build event, which happens for inital build and rebuilds
  compilerCtx.events.emit('build', buildResults);

  if (compilerCtx.isRebuild) {
    // emit a rebuild event, which happens only for rebuilds
    compilerCtx.events.emit('rebuild', buildResults);
  }

  return buildResults;
}


function generateBuildResults(config: Config, compilerCtx: CompilerCtx, buildCtx: BuildCtx) {
  // create the build results that get returned
  const buildResults: BuildResults = {
    buildId: buildCtx.buildId,
    compiler: `${config.sys.compiler.name} v${config.sys.compiler.version}`,
    diagnostics: cleanDiagnostics(buildCtx.diagnostics),
    hasError: hasError(buildCtx.diagnostics),
    aborted: buildCtx.aborted,
    duration: Date.now() - buildCtx.startTime,
    isRebuild: compilerCtx.isRebuild,
    transpileBuildCount: buildCtx.transpileBuildCount,
    bundleBuildCount: buildCtx.bundleBuildCount,
    hasChangedJsText: buildCtx.hasChangedJsText,
    filesWritten: buildCtx.filesWritten.sort(),
    filesChanged: buildCtx.filesChanged.slice().sort(),
    filesUpdated: buildCtx.filesUpdated.slice().sort(),
    filesAdded: buildCtx.filesAdded.slice().sort(),
    filesDeleted: buildCtx.filesDeleted.slice().sort(),
    dirsAdded: buildCtx.dirsAdded.slice().sort(),
    dirsDeleted: buildCtx.dirsDeleted.slice().sort(),

    entries: [],

    bundles: buildCtx.entryModules.map(en => {
      const buildEntry: BuildBundle = {
        components: (en.moduleFiles || []).map(m => m.cmpMeta.tagNameMeta).sort(),

        outputFiles: (en.outputFileNames || []).slice().sort(),

        inputFiles: (en.moduleFiles || []).map(m => {
          return pathJoin(config, config.sys.path.relative(config.rootDir, m.jsFilePath));
        }).sort()
      };

      const modes = en.modeNames.slice().sort();
      if (modes.length > 1 || (modes.length === 1 && modes[0] !== DEFAULT_STYLE_MODE)) {
        buildEntry.modes = modes;
      }

      return buildEntry;
    })
  };

  buildCtx.entryPoints.forEach(ep => {
    ep.forEach(ec => {
      const buildEntry: BuildEntry = {
        tag: ec.tag,
        dependencyOf: ec.dependencyOf.slice()
      };
      buildResults.entries.push(buildEntry);
    });
  });

  buildCtx.entryModules.map(en => {
    const buildEntry: BuildBundle = {
      components: (en.moduleFiles || []).map(m => m.cmpMeta.tagNameMeta).sort(),

      outputFiles: (en.outputFileNames || []).slice().sort(),

      inputFiles: (en.moduleFiles || []).map(m => {
        return pathJoin(config, config.sys.path.relative(config.rootDir, m.jsFilePath));
      }).sort()
    };

    const modes = en.modeNames.slice().sort();
    if (modes.length > 1 || (modes.length === 1 && modes[0] !== DEFAULT_STYLE_MODE)) {
      buildEntry.modes = modes;
    }

    return buildEntry;
  });

  return buildResults;
}


function shouldAbort(ctx: CompilerCtx, buildCtx: BuildCtx) {
  if (ctx.activeBuildId > buildCtx.buildId || buildCtx.aborted) {
    buildCtx.aborted = true;
    return true;
  }

  if (hasError(buildCtx.diagnostics)) {
    // remember if the last build had an error or not
    // this is useful if the next build should do a full build or not
    ctx.lastBuildHadError = true;

    buildCtx.aborted = true;
    return true;
  }

  return false;
}
