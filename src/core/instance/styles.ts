import { ComponentConstructor, ComponentMeta, ComponentMetaTemplates, DomApi, HostElement } from '../../util/interfaces';
import { DEFAULT_STYLE_MODE, ENCAPSULATION } from '../../util/constants';


export function initStyleTemplate(domApi: DomApi, cmpMeta: ComponentMeta, componentConstructor: ComponentConstructor) {
  const style = componentConstructor['style'];
  if (style) {
    // create the template element which will hold the styles
    // adding it to the dom via <template> so that we can
    // clone this for each potential shadow root that will need these styles
    // otherwise it'll be cloned and added to the document
    // but that's for the renderer to figure out later
    const templateElm = domApi.$createElement('template') as any;

    const templateId = cmpMeta.tagNameMeta + (componentConstructor['styleMode'] || DEFAULT_STYLE_MODE);
    (cmpMeta as ComponentMetaTemplates)[templateId] = templateElm;

    // add the style text to the template element's innerHTML
    templateElm.innerHTML = '<style>' + style + '</style>';

    // add our new template element to the head
    // so it can be cloned later
    domApi.$appendChild(domApi.$head, templateElm);
  }
}


export function attachStyles(domApi: DomApi, cmpMeta: ComponentMeta, modeName: string, elm: HostElement) {
  const templateId = cmpMeta.tagNameMeta + (modeName || DEFAULT_STYLE_MODE);
  const templateElm = (cmpMeta as ComponentMetaTemplates)[templateId];

  if (templateElm) {
    let styleContainerNode: HTMLElement = domApi.$head;

    if (domApi.$supportsShadowDom) {
      if (cmpMeta.encapsulation === ENCAPSULATION.ShadowDom) {
        styleContainerNode = (elm.shadowRoot as any);

      } else {
        while ((elm as Node) = domApi.$parentNode(elm)) {
          if ((elm as any).host && (elm as any).host.shadowRoot) {
            styleContainerNode = (elm as any).host.shadowRoot;
            break;
          }
        }
      }
    }

    const appliedStyles = ((styleContainerNode as HostElement)._appliedStyles = (styleContainerNode as HostElement)._appliedStyles || {});

    if (!appliedStyles[templateId]) {

      // not using the css shim
      // we haven't added these styles to this element yet
      const styleElm = templateElm.content.cloneNode(true) as HTMLStyleElement;

      const insertReferenceNode = styleContainerNode.querySelector('[data-visibility]');
      domApi.$insertBefore(styleContainerNode, styleElm, (insertReferenceNode && insertReferenceNode.nextSibling) || styleContainerNode.firstChild);

      // remember we don't need to do this again for this element
      appliedStyles[templateId] = true;
    }
  }
}
