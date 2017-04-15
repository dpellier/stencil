
export interface Ionic {
  staticDir?: string;
  components?: LoadComponents;
  loadComponents?: {(bundleId: string): void};
  config?: Object;
  configCtrl?: ConfigApi;
  domCtrl?: DomControllerApi;
  nextTickCtrl?: NextTickApi;
}


export interface NextTickApi {
  nextTick: NextTick;
}


export interface NextTick {
  (cb: Function): void;
}


export interface DomRead {
  (cb: Function): void;
}


export interface DomWrite {
  (cb: Function): void;
}


export interface DomControllerApi {
  read: DomRead;
  write: DomWrite;
}


export interface RafCallback {
  (timeStamp?: number): void;
}


export interface RequestAnimationFrame {
  (cb: RafCallback): void;
}


export interface LoadComponents {
  [tag: string]: any[];
}


export interface ComponentModeData {
  /**
   * tag (ion-badge)
   */
  [0]: string;

  /**
   * modeName (ios,md,wp)
   */
  [1]: string;

  /**
   * styles
   */
  [2]: string;

  /**
   * moduleFn
   */
  [3]: ComponentModeImporterFn;
}


export interface ComponentModeImporterFn {
  (importer: any, h: Hyperscript, ionicTheme: IonicTheme): void;
}


export interface ComponentDecorator {
  (opts?: ComponentOptions): any;
}


export interface ComponentOptions {
  tag: string;
  styleUrls?: string[] | ModeStyles;
}

export interface ModeStyles {
  [modeName: string]: string | string[];
}


export interface PropDecorator {
  (opts?: PropOptions): any;
}


export interface IonicTheme {
  (instance: ComponentInstance, hostCss: string): VNodeData;
}


export interface ConfigApi {
  get: (key: string, fallback?: any) => any;
}


export interface ComponentMeta {
  tag?: string;
  props?: Props;
  observedAttrs?: string[];
  hostCss?: string;
  componentModule?: any;
  modes: {[modeName: string]: ComponentMode};
}


export interface ComponentMode {
  isLoaded?: boolean;
  bundleId?: string;
  styles?: string;
  styleUrls?: string[];
  styleElm?: HTMLElement;
}


export interface ComponentInstance {
  render?: {(): VNode};

  mode?: string;
  color?: string;
}


export interface ComponentController {
  rootElm?: HTMLElement | ShadowRoot;
  queued?: boolean;
  instance?: ComponentInstance;
  vnode?: VNode;
}


export interface ComponentModule {
  new (): ComponentInstance;
}


export interface ComponentRegistry {
  [tag: string]: ComponentMeta;
}


export interface PropOptions {
  type?: 'string' | 'boolean' | 'number' | 'Array' | 'Object';
}


export interface Props {
  [propName: string]: PropOptions;
}


export interface ProxyElement extends HTMLElement {
  connectedCallback: {(): void};
  attributeChangedCallback: {(attrName: string, oldVal: string, newVal: string, namespace: string): void};
  disconnectedCallback: {(): void};
}


export interface RendererApi {
  (oldVnode: VNode | Element, vnode: VNode): VNode;
}


export type Key = string | number;


export interface Hyperscript {
  (sel: any): any;
  (sel: Node, data: VNodeData): any;
  (sel: any, data: VNodeData): any;
  (sel: any, text: string): any;
  (sel: any, children: Array<any>): any;
  (sel: any, data: VNodeData, text: string): any;
  (sel: any, data: VNodeData, children: Array<any|string>): any;
  (sel: any, data: VNodeData, children: any): any;
}


export interface VNode {
  sel: string | undefined;
  vdata: VNodeData | undefined;
  vchildren: Array<VNode | string> | undefined;
  elm: Node | undefined;
  vtext: string | undefined;
  vkey: Key;
}


export interface VNodeData {
  props?: any;
  attrs?: any;
  class?: any;
  style?: any;
  dataset?: any;
  on?: any;
  attachData?: any;
  vkey?: Key;
  vns?: string; // for SVGs
  [key: string]: any; // for any other 3rd party module
}


export interface PlatformApi {
  registerComponent: (tag: string, data: any[]) => ComponentMeta;
  getComponentMeta: (tag: string) => ComponentMeta;
  loadComponent: (cmpMeta: ComponentMeta, cmpMode: ComponentMode, cb: Function) => void;
  nextTick: NextTick;
  domRead: DomRead;
  domWrite: DomWrite;

  isElement: (node: Node) => node is Element;
  isText: (node: Node) => node is Text;
  isComment: (node: Node) => node is Comment;

  $createElement<K extends keyof HTMLElementTagNameMap>(tagName: K): HTMLElementTagNameMap[K];
  $createElementNS: (namespaceURI: string, qualifiedName: string) => Element;
  $createTextNode: (text: string) => Text;
  $createComment: (text: string) => Comment;
  $insertBefore: (parentNode: Node, newNode: Node, referenceNode: Node | null) => void;
  $removeChild: (parentNode: Node, childNode: Node) => void;
  $appendChild: (parentNode: Node, childNode: Node) => void;
  $parentNode: (node: Node) => Node;
  $nextSibling: (node: Node) => Node;
  $tagName: (elm: Element) => string;
  $setTextContent: (node: Node, text: string | null) => void;
  $getTextContent: (node: Node) => string | null;
  $getAttribute: (elm: Element, attrName: string) => string;
  $attachShadow: (elm: Element, cmpMode: ComponentMode, cmpModeId: string) => ShadowRoot;
}


export interface ServerInitConfig {
  staticDir: string;
  config?: Object;
}