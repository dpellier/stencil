import { Build } from '../../util/build-conditionals';
import { ComponentMeta, DomApi, ImportedModule } from '../../util/interfaces';
import { dashToPascalCase } from '../../util/helpers';
import { initStyleTemplate } from '../../core/instance/styles';
import { parseComponentMeta } from '../../util/data-parse';


export function initModule(domApi: DomApi, cmpMeta: ComponentMeta, importedModule: ImportedModule, cb: Function) {
  if (!cmpMeta.componentConstructor) {
    // we haven't initialized the component module yet

    // get the component constructor from the module
    // and parse the static meta data into data which this runtime understands
    parseComponentMeta(cmpMeta, cmpMeta.componentConstructor = importedModule[dashToPascalCase(cmpMeta.tagNameMeta)]);

    if (Build.styles) {
      initStyleTemplate(domApi, cmpMeta, cmpMeta.componentConstructor);
    }
  }

  // cool, we're done here
  // component module loaded and now initialized
  cb();
}
