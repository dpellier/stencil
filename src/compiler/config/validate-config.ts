import { Config } from '../../declarations';
import { validateCopy } from './validate-copy';
import { validateDependentCollection } from './validate-collection';
import { validateNamespace } from './validate-namespace';
import { validatePaths } from './validate-paths';


export function validateBuildConfig(config: Config, setEnvVariables?: boolean) {
  if (!config) {
    throw new Error(`invalid build config`);
  }

  if (config._isValidated) {
    // don't bother if we've already validated this config
    return config;
  }

  if (!config.logger) {
    throw new Error(`config.logger required`);
  }
  if (!config.rootDir) {
    throw new Error('config.rootDir required');
  }
  if (!config.sys) {
    throw new Error('config.sys required');
  }

  if (typeof config.logLevel === 'string') {
    config.logger.level = config.logLevel;
  } else if (typeof config.logger.level === 'string') {
    config.logLevel = config.logger.level;
  }

  if (typeof config.writeStats !== 'boolean') {
    config.writeStats = false;
  }

  if (typeof config.writeLog !== 'boolean') {
    config.writeLog = false;
  }

  if (typeof config.buildAppCore !== 'boolean') {
    config.buildAppCore = true;
  }

  // get a good namespace
  validateNamespace(config);

  // figure out all of the config paths and absolute paths
  validatePaths(config);

  // default devMode false
  config.devMode = !!config.devMode;

  // default watch false
  config.watch = !!config.watch;

  if (typeof config.minifyCss !== 'boolean') {
    // if no config, minify css when it's the prod build
    config.minifyCss = (!config.devMode);
  }

  if (typeof config.minifyJs !== 'boolean') {
    // if no config, minify js when it's the prod build
    config.minifyJs = (!config.devMode);
  }
  config.logger.debug(`minifyJs: ${config.minifyJs}, minifyCss: ${config.minifyCss}`);

  if (typeof config.hashFileNames !== 'boolean' && typeof (config as any).hashFilenames === 'boolean') {
    config.hashFileNames = (config as any).hashFilenames;
    config.logger.warn(`"hashFilenames" was used in the config, did you mean "hashFileNames"? (Has a capital N)`);
  }

  if (typeof config.hashFileNames !== 'boolean') {
    // hashFileNames config was not provided, so let's create the default

    if (config.devMode || config.watch) {
      // dev mode should not hash filenames
      // during watch rebuilds it should not hash filenames
      config.hashFileNames = false;

    } else {
      // prod builds should hash filenames
      config.hashFileNames = true;
    }
  }

  if (typeof config.hashedFileNameLength !== 'number') {
    config.hashedFileNameLength = DEFAULT_HASHED_FILENAME_LENTH;
  }
  if (config.hashFileNames) {
    if (config.hashedFileNameLength < 4) {
      throw new Error(`config.hashedFileNameLength must be at least 4 characters`);
    }
  }
  config.logger.debug(`hashFileNames: ${config.hashFileNames}, hashedFileNameLength: ${config.hashedFileNameLength}`);

  config.generateDistribution = !!config.generateDistribution;

  if (typeof config.generateWWW !== 'boolean') {
    config.generateWWW = true;
  }

  validateCopy(config);

  if (!config.watchIgnoredRegex) {
    config.watchIgnoredRegex = DEFAULT_WATCH_IGNORED_REGEX;
  }

  if (typeof config.hydratedCssClass !== 'string') {
    config.hydratedCssClass = DEFAULT_HYDRATED_CSS_CLASS;
  }

  if (typeof config.buildEs5 !== 'boolean') {
    if (config.devMode) {
      // default dev mode only builds es2015
      config.buildEs5 = false;

    } else {
      // default prod mode builds both es2015 and es5
      config.buildEs5 = true;
    }
  }

  if (typeof config.emptyDist !== 'boolean') {
    config.emptyDist = true;
  }

  if (typeof config.emptyWWW !== 'boolean') {
    config.emptyWWW = true;
  }

  if (typeof config.generateDocs !== 'boolean') {
    config.generateDocs = false;
  }

  if (typeof config.enableCache !== 'boolean') {
    config.enableCache = false;
  }

  if (!Array.isArray(config.includeSrc)) {
    config.includeSrc = DEFAULT_INCLUDES.map(include => {
      return config.sys.path.join(config.srcDir, include);
    });
  }

  if (!Array.isArray(config.excludeSrc)) {
    config.excludeSrc = DEFAULT_EXCLUDES.slice();
  }

  config.collections = Array.isArray(config.collections) ? config.collections : [];
  config.collections = config.collections.map(validateDependentCollection);

  config.plugins = Array.isArray(config.plugins) ? config.plugins : [];

  config.bundles = Array.isArray(config.bundles) ? config.bundles : [];

  // set to true so it doesn't bother going through all this again on rebuilds
  config._isValidated = true;

  config.logger.debug(`validated build config`);

  if (setEnvVariables !== false) {
    setProcessEnvironment(config);
  }

  return config;
}


export function setProcessEnvironment(config: Config) {
  process.env.NODE_ENV = config.devMode ? 'development' : 'production';
}


const DEFAULT_HASHED_FILENAME_LENTH = 8;
const DEFAULT_INCLUDES = ['**/*.ts', '**/*.tsx'];
const DEFAULT_EXCLUDES = ['**/test/**', '**/*.spec.*'];
const DEFAULT_WATCH_IGNORED_REGEX = /(\.(jpg|jpeg|png|gif|woff|woff2|ttf|eot)|(?:^|[\\\/])(\.(?!\.)[^\\\/]+)$)$/i;
const DEFAULT_HYDRATED_CSS_CLASS = 'hydrated';
