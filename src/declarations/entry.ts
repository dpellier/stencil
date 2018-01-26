import * as d from './index';


export interface EntryModule {
  entryKey?: string;
  moduleFiles: d.ModuleFile[];
  compiledModuleJsText?: string;
  compiledModuleLegacyJsText?: string;
  requiresScopedStyles?: boolean;
  modeNames?: string[];
}
