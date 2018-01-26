import { EntryModule } from '../../../declarations';
import { generateBundleEntryInput } from '../bundle-entry-input';


export default function bundleEntryFile(entryModule: EntryModule) {

  return {
    name: 'bundleEntryFilePlugin',

    resolveId(importee: string) {
      if (importee === entryModule.entryKey) {
        return entryModule.entryKey;
      }

      return null;
    },

    load(id: string) {
      if (id === entryModule.entryKey) {
        return generateBundleEntryInput(entryModule);
      }

      return null;
    }
  };
}
