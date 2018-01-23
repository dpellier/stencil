import { Bundle, CompilerCtx, Config, Diagnostic, ModuleFile } from '../../../declarations';
import { addRootBundleFromIndexHtml, addUserBundlesFromConfig, appAppComponentBundles, getBundleGraph, initBundles } from '../component-bundles';
import { mockCompilerCtx, mockConfig } from '../../../testing/mocks';
import { validateBuildConfig } from '../../config/validate-config';


describe('component graph', () => {

  let config: Config;
  let compilerCtx: CompilerCtx;
  let diagnostics: Diagnostic[];

  beforeEach(() => {
    config = mockConfig();
    compilerCtx = mockCompilerCtx();
    diagnostics = [];
  });

  describe('getBundleGraph', () => {

    it('should get deep graph, circular deps', () => {
      const allModuleFiles: ModuleFile[] = [
        { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b', 'cmp-a'] } },
        { cmpMeta: { tagNameMeta: 'cmp-b', componentGraph: ['cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-c', componentGraph: ['cmp-d', 'cmp-e'] } },
        { cmpMeta: { tagNameMeta: 'cmp-d', componentGraph: ['cmp-b', 'cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-e', componentGraph: ['cmp-a', 'cmp-f'] } },
        { cmpMeta: { tagNameMeta: 'cmp-f' } }
      ];
      const m = getBundleGraph(allModuleFiles, ['cmp-a']);
      expect(m).toHaveLength(6);
      expect(m[0].cmpMeta.tagNameMeta).toBe('cmp-a');
      expect(m[1].cmpMeta.tagNameMeta).toBe('cmp-b');
      expect(m[2].cmpMeta.tagNameMeta).toBe('cmp-c');
      expect(m[3].cmpMeta.tagNameMeta).toBe('cmp-d');
      expect(m[4].cmpMeta.tagNameMeta).toBe('cmp-e');
      expect(m[5].cmpMeta.tagNameMeta).toBe('cmp-f');
    });

    it('should get simple graph', () => {
      const allModuleFiles: ModuleFile[] = [
        { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b'] } },
        { cmpMeta: { tagNameMeta: 'cmp-b' } },
        { cmpMeta: { tagNameMeta: 'cmp-c' } },
      ];
      const m = getBundleGraph(allModuleFiles, ['cmp-a']);
      expect(m).toHaveLength(2);
      expect(m[0].cmpMeta.tagNameMeta).toBe('cmp-a');
      expect(m[1].cmpMeta.tagNameMeta).toBe('cmp-b');
    });

  });

  describe('appAppComponentBundles', () => {

    fit('do not bundle duplicates', () => {
      const allModuleFiles: ModuleFile[] = [
        { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b'] } },
        { cmpMeta: { tagNameMeta: 'cmp-b' } },
        { cmpMeta: { tagNameMeta: 'cmp-c', componentGraph: ['cmp-d', 'cmp-e'] } },
        { cmpMeta: { tagNameMeta: 'cmp-d' } },
        { cmpMeta: { tagNameMeta: 'cmp-e' } },
        // { cmpMeta: { tagNameMeta: 'cmp-f', componentGraph: ['cmp-b'] } }
      ];

      const bundles = appAppComponentBundles(allModuleFiles, []);
      expect(bundles[0].moduleFiles).toHaveLength(2);
      expect(bundles[0].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-a');
      expect(bundles[0].moduleFiles[1].cmpMeta.tagNameMeta).toBe('cmp-b');

      expect(bundles[1].moduleFiles).toHaveLength(3);
      expect(bundles[1].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-c');
      expect(bundles[1].moduleFiles[1].cmpMeta.tagNameMeta).toBe('cmp-d');
      expect(bundles[1].moduleFiles[2].cmpMeta.tagNameMeta).toBe('cmp-e');

      // expect(bundles[1].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-c');
      // expect(bundles[1].moduleFiles[1].cmpMeta.tagNameMeta).toBe('cmp-d');
      // expect(bundles[0].moduleFiles[3].cmpMeta.tagNameMeta).toBe('cmp-d');
      // expect(bundles[0].moduleFiles[4].cmpMeta.tagNameMeta).toBe('cmp-e');
      // expect(bundles[0].moduleFiles[5].cmpMeta.tagNameMeta).toBe('cmp-f');
    });

    it('bundle it all', () => {
      const allModuleFiles: ModuleFile[] = [
        { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b', 'cmp-a'] } },
        { cmpMeta: { tagNameMeta: 'cmp-b', componentGraph: ['cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-c', componentGraph: ['cmp-d', 'cmp-e'] } },
        { cmpMeta: { tagNameMeta: 'cmp-d', componentGraph: ['cmp-b', 'cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-e', componentGraph: ['cmp-a', 'cmp-f'] } },
        { cmpMeta: { tagNameMeta: 'cmp-f' } }
      ];

      const bundles = appAppComponentBundles(allModuleFiles, []);
      expect(bundles).toHaveLength(1);
      expect(bundles[0].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-a');
      expect(bundles[0].moduleFiles[1].cmpMeta.tagNameMeta).toBe('cmp-b');
      expect(bundles[0].moduleFiles[2].cmpMeta.tagNameMeta).toBe('cmp-c');
      expect(bundles[0].moduleFiles[3].cmpMeta.tagNameMeta).toBe('cmp-d');
      expect(bundles[0].moduleFiles[4].cmpMeta.tagNameMeta).toBe('cmp-e');
      expect(bundles[0].moduleFiles[5].cmpMeta.tagNameMeta).toBe('cmp-f');
    });

    it('do not include collection dependencies', () => {
      const allModuleFiles: ModuleFile[] = [
        { cmpMeta: { tagNameMeta: 'cmp-a' } },
        { cmpMeta: { tagNameMeta: 'cmp-b' } },
        { cmpMeta: { tagNameMeta: 'collection-a' }, isCollectionDependency: true },
        { cmpMeta: { tagNameMeta: 'collection-b' }, isCollectionDependency: true }
      ];
      const bundles = appAppComponentBundles(allModuleFiles, []);
      expect(bundles).toHaveLength(2);
      expect(bundles[0].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-a');
      expect(bundles[1].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-b');
    });

    it('basic', () => {
      const allModuleFiles: ModuleFile[] = [
        { cmpMeta: { tagNameMeta: 'cmp-a' } },
        { cmpMeta: { tagNameMeta: 'cmp-b' } },
        { cmpMeta: { tagNameMeta: 'cmp-c' } },
        { cmpMeta: { tagNameMeta: 'cmp-d' } }
      ];
      const bundles = appAppComponentBundles(allModuleFiles, []);
      expect(bundles).toHaveLength(4);
    });

  });

  describe('addRootBundleFromIndexHtml', () => {

    it('should bundle modules already in a bundle', async () => {
      config.generateWWW = true;
      config.srcIndexHtml = '/src/index.html';
      compilerCtx.fs.writeFile(config.srcIndexHtml, `
        <cmp-a>
          <cmp-b></cmp-b>
        </cmp-a>
        <cmp-c></cmp-c>
        <cmp-d></cmp-d>
      `);

      const allModuleFiles: ModuleFile[] = [
        { cmpMeta: { tagNameMeta: 'cmp-a' } },
        { cmpMeta: { tagNameMeta: 'cmp-b' } },
        { cmpMeta: { tagNameMeta: 'cmp-c' } },
        { cmpMeta: { tagNameMeta: 'cmp-d' } }
      ];

      const existingBundles: Bundle[] = [
        { moduleFiles: [ { cmpMeta: { tagNameMeta: 'cmp-a' } } ] },
        { moduleFiles: [ { cmpMeta: { tagNameMeta: 'cmp-b' } }, { cmpMeta: { tagNameMeta: 'cmp-c' } } ] }
      ];

      const bundle = await addRootBundleFromIndexHtml(config, compilerCtx, allModuleFiles, existingBundles);
      expect(bundle.moduleFiles).toHaveLength(1);
      expect(bundle.moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-d');
    });


    it('get modules from index.html', async () => {
      config.generateWWW = true;
      config.srcIndexHtml = '/src/index.html';
      compilerCtx.fs.writeFile(config.srcIndexHtml, `
        <cmp-a>
          <cmp-b></cmp-b>
        </cmp-a>
        <cmp-c></cmp-c>
      `);

      const allModuleFiles: ModuleFile[] = [
        { cmpMeta: { tagNameMeta: 'cmp-a' } },
        { cmpMeta: { tagNameMeta: 'cmp-b' } },
        { cmpMeta: { tagNameMeta: 'cmp-c' } },
        { cmpMeta: { tagNameMeta: 'cmp-d' } }
      ];

      const bundle = await addRootBundleFromIndexHtml(config, compilerCtx, allModuleFiles, []);
      expect(bundle.moduleFiles).toHaveLength(3);
      expect(bundle.moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-a');
      expect(bundle.moduleFiles[1].cmpMeta.tagNameMeta).toBe('cmp-b');
      expect(bundle.moduleFiles[2].cmpMeta.tagNameMeta).toBe('cmp-c');
    });

    it('do nothing when no no srcIndexHtml', async () => {
      config.generateWWW = true;
      config.srcIndexHtml = null;
      const bundle = await addRootBundleFromIndexHtml(config, compilerCtx, [], []);
      expect(bundle).toBe(null);
    });

    it('do nothing when not generating www', async () => {
      config.generateWWW = false;
      const bundle = await addRootBundleFromIndexHtml(config, compilerCtx, [], []);
      expect(bundle).toBe(null);
    });

  });

  describe('addUserBundlesFromConfig', () => {

    it('add diagnostic error component doesnt exist', () => {
      config.bundles = [
        { components: ['cmp-a', 'cmp-zz'] }
      ];

      const allModuleFiles: ModuleFile[] = [
        { cmpMeta: { tagNameMeta: 'cmp-a' } }
      ];

      const bundles = addUserBundlesFromConfig(config.bundles, diagnostics, allModuleFiles);
      expect(bundles).toHaveLength(1);
      expect(bundles[0].moduleFiles).toHaveLength(1);
      expect(bundles[0].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-a');

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].messageText).toContain('cmp-zz');
      expect(diagnostics[0].messageText).toContain('no matching component');
    });

    it('basic create bundles from config, disregard graph', () => {
      config.bundles = [
        { components: ['cmp-a', 'cmp-f'] },
        { components: ['cmp-b', 'cmp-c'] },
        { components: ['cmp-d'] }
      ];

      const allModuleFiles: ModuleFile[] = [
        { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b', 'cmp-a'] } },
        { cmpMeta: { tagNameMeta: 'cmp-b', componentGraph: ['cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-c', componentGraph: ['cmp-d', 'cmp-e'] } },
        { cmpMeta: { tagNameMeta: 'cmp-d', componentGraph: ['cmp-b', 'cmp-c'] } },
        { cmpMeta: { tagNameMeta: 'cmp-e', componentGraph: ['cmp-a', 'cmp-f'] } },
        { cmpMeta: { tagNameMeta: 'cmp-f' } }
      ];

      const bundles = addUserBundlesFromConfig(config.bundles, diagnostics, allModuleFiles);
      expect(bundles).toHaveLength(3);

      expect(bundles[0].moduleFiles).toHaveLength(2);
      expect(bundles[0].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-a');
      expect(bundles[0].moduleFiles[1].cmpMeta.tagNameMeta).toBe('cmp-f');

      expect(bundles[1].moduleFiles).toHaveLength(2);
      expect(bundles[1].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-b');
      expect(bundles[1].moduleFiles[1].cmpMeta.tagNameMeta).toBe('cmp-c');

      expect(bundles[2].moduleFiles).toHaveLength(1);
      expect(bundles[2].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-d');
    });

  });

  // describe('initBundles', () => {

  //   it('basic bundles, no config.bundles, no root html', async () => {
  //     config.bundles = [];
  //     config.srcIndexHtml = null;

  //     const allModuleFiles: ModuleFile[] = [
  //       { cmpMeta: { tagNameMeta: 'cmp-a', componentGraph: ['cmp-b'] } },
  //       { cmpMeta: { tagNameMeta: 'cmp-b', componentGraph: ['cmp-c'] } },
  //       { cmpMeta: { tagNameMeta: 'cmp-c' } },
  //       { cmpMeta: { tagNameMeta: 'cmp-d', componentGraph: ['cmp-b'] } },
  //       { cmpMeta: { tagNameMeta: 'cmp-e', componentGraph: ['cmp-c', 'cmp-f'] } },
  //       { cmpMeta: { tagNameMeta: 'cmp-f' } }
  //     ];
  //     const bundles = await initBundles(config, compilerCtx, diagnostics, allModuleFiles);

  //     expect(bundles).toHaveLength(5);
  //     expect(bundles[0].moduleFiles).toHaveLength(3);
  //     // expect(bundles[0].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-a');
  //     // expect(bundles[0].moduleFiles[1].cmpMeta.tagNameMeta).toBe('cmp-b');
  //     // expect(bundles[0].moduleFiles[2].cmpMeta.tagNameMeta).toBe('cmp-c');

  //     // expect(bundles[1].moduleFiles).toHaveLength(2);
  //     // expect(bundles[1].moduleFiles[0].cmpMeta.tagNameMeta).toBe('cmp-b');
  //     // expect(bundles[1].moduleFiles[1].cmpMeta.tagNameMeta).toBe('cmp-c');
  //   });

  // });

});
