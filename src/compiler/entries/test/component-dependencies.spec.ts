import { findComponentDeps } from '../component-dependencies';


describe('component dependencies', () => {

  const appTags = ['cmp-a', 'cmp-b'];

  it('not find tag in markdown bullet', () => {
    const foundTags = findComponentDeps(appTags, `
      * cmp-a
      *cmp-b
    `);
    expect(foundTags).toHaveLength(0);
  });

  it('not find tag in markdown header', () => {
    const foundTags = findComponentDeps(appTags, `
      # cmp-a
      #cmp-b
    `);
    expect(foundTags).toHaveLength(0);
  });

  it('not find tag in markdown links', () => {
    const foundTags = findComponentDeps(appTags, `
      view [cmp-a](/cmp-a)
    `);
    expect(foundTags).toHaveLength(0);
  });

  it('not find tag in js single line comment, no space', () => {
    const foundTags = findComponentDeps(appTags, `
      //cmp-a hello
    `);
    expect(foundTags).toHaveLength(0);
  });

  it('not find tag in js comment, no space', () => {
    const foundTags = findComponentDeps(appTags, `
      /*cmp-a hello*/
    `);
    expect(foundTags).toHaveLength(0);
  });

  it('not find tag surrounded by whitespace', () => {
    const foundTags = findComponentDeps(appTags, `
      I really like the cmp-a cmponent
      and the
      \tcmp-b
      is swell too
    `);
    expect(foundTags).toHaveLength(0);
  });

  it('find tag within tick quotes', () => {
    const foundTags = findComponentDeps(appTags,
      'document.createElement(`cmp-a`)' +
      'h(`cmp-b`)'
    );
    expect(foundTags).toContain('cmp-a');
    expect(foundTags).toContain('cmp-b');
  });

  it('find tag within double quotes', () => {
    const foundTags = findComponentDeps(appTags, `
      document.createElement("cmp-a")
      h("cmp-b")
    `);
    expect(foundTags).toContain('cmp-a');
    expect(foundTags).toContain('cmp-b');
  });

  it('find tag within single quotes', () => {
    const foundTags = findComponentDeps(appTags, `
      document.createElement('cmp-a')
      h('cmp-b')
    `);
    expect(foundTags).toContain('cmp-a');
    expect(foundTags).toContain('cmp-b');
  });

  it('find JSX self closing w/ attrs, multiline', () => {
    const foundTags = findComponentDeps(appTags, `
      <cmp-a
      checked="true"/>
    `);
    expect(foundTags).toContain('cmp-a');
  });

  it('find JSX self closing w/ attrs', () => {
    const foundTags = findComponentDeps(appTags, `
      <cmp-a checked="true"/>
    `);
    expect(foundTags).toContain('cmp-a');
  });

  it('find JSX self closing tags', () => {
    const foundTags = findComponentDeps(appTags, `
      <cmp-a/>
    `);
    expect(foundTags).toContain('cmp-a');
  });

  it('find html tags, w/ attrs', () => {
    const foundTags = findComponentDeps(appTags, `
      <cmp-a checked="true"></cmp-a>
    `);
    expect(foundTags).toContain('cmp-a');
  });

  it('find html tags w/ any case', () => {
    const foundTags = findComponentDeps(appTags, `
      <cMp-A></Cmp-a>
      <CMp-B></cmp-B>
    `);
    expect(foundTags).toContain('cmp-a');
    expect(foundTags).toContain('cmp-b');
  });

  it('not find html tags that start out the same', () => {
    const foundTags = findComponentDeps(appTags, `
      <cmp-aa></cmp-aa>
      <cmp-bbb></cmp-bbb>
    `);
    expect(foundTags).not.toContain('cmp-a');
    expect(foundTags).not.toContain('cmp-b');
  });

  it('find html tags, no attrs', () => {
    const foundTags = findComponentDeps(appTags, `
      <cmp-b></cmp-b>
      <cmp-a></cmp-a>
    `);
    expect(foundTags).toEqual(['cmp-a', 'cmp-b']);
  });

});
