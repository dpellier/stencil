import { Build } from '../../util/build-conditionals';
import { ComponentMeta, DomApi } from '../../util/interfaces';
import { dashToPascalCase } from '../../util/helpers';
import { initStyleTemplate } from '../../core/instance/styles';


export function initModule(domApi: DomApi, cmpMeta: ComponentMeta, module: any, cb: Function) {
  if (!cmpMeta.componentModule) {
    // we haven't initialized the component module yet

    // get the component module
    cmpMeta.componentModule = module[dashToPascalCase(cmpMeta.tagNameMeta)];

    if (Build.styles) {
      initStyleTemplate(domApi, cmpMeta, cmpMeta.componentModule);
    }
  }

  // cool, we're done here, all initialized
  cb();
}
