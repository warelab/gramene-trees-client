describe('Trees', function () {
  // json response to http://data.gramene.org/taxonomy/select?rows=-1
  // converted into a commonJS module by prepending json doc with
  // `module.exports = `
  var fixture = require('../support/taxonomyFixture.js');
  var taxonomy = require('../../src/taxonomy');

  var root;

  beforeEach(function() {
    root = taxonomy.tree(fixture.data.response);
  });

  it('should populate treemodel api', function () {
    expect(root).toBeDefined();
    expect(root.isRoot()).toBeTruthy();
    expect(root.hasChildren()).toBeTruthy();
  });

  it('should have 42 species', function () {
    // when
    var leaves = root.leafNodes();

    // then
    expect(leaves.length).toEqual(42);
  });

  it('should sort child nodes alphabetically', function () {
    // when we get all nodes with >1 child
    var multipleChildrenNodes = root.all(function (n) {
      return n.children.length > 1;
    });

    multipleChildrenNodes.map(function(node) {
      var children = node.children,
        a,
        b;
      for(var i = 1; i < children.length; i++) {
        a = children[i-1].model.name;
        b = children[i].model.name;

        expect(a < b).toBeTruthy(a + ' should lexically precede ' + b);
      }
    });
  });

  it('should compress paths in the tree', function() {
    // when ask for all nodes with exactly one child
    var singleChildNode = root.all(function (n) {
      return n.children.length === 1
    });

    // then we should only find the root node
    expect(singleChildNode.length).toEqual(1);
    expect(singleChildNode[0].model.name).toEqual('root');
  });

  it('should index nodes by id and name', function() {
    // when
    var rootById = root.indices.id[1];
    var rootByName = root.indices.name['root'];

    expect(rootById === rootByName).toBeTruthy();
  });

  it('should index compressed nodes (nodes that are not traversed by the tree)', function() {
    // when
    var cellularByName = root.indices.name['cellular organisms'];

    expect(cellularByName.compressed).toBeTruthy();
    expect(cellularByName.model.id).toEqual(131567);
    expect(cellularByName.children.length).toEqual(1);
    expect(cellularByName.parent.model.name).toEqual('root');
  });

  it('should calculate last common ancestor from the tree', function() {
    // given
    var testCases = [
      {name: 'ath', ids: [3702], lca: 3702},
      {name: 'arabidopsis', ids: [3702, 81972], lca: 3701},
      {name: 'rosids', ids: [3702, 29760], lca: 71275},
      {name: 'oryza', ids: [39947, 4528, 4538], lca: 4527},
      {name: 'poaceae', ids: [39947, 4528, 4538, 4577], lca: 4479}
    ].map(function nodesFromIds(testCase) {
        testCase.nodes = testCase.ids.map(function(id) {
          return root.indices.id[id]
        });
        testCase.lcaNode = root.indices.id[testCase.lca];
        return testCase;
      });

    testCases.map(function testLCA(testCase) {
      var lca = root.lca(testCase.nodes);
      expect(lca).toBeDefined();
      expect(lca.model.name).toEqual(testCase.lcaNode.model.name);
    });
  });

  it('should find the last common ancestor of all species', function() {
    // given
    var species = root.leafNodes();

    // when
    var plantRoot = root.lca(species);

    expect(plantRoot.model.name).toEqual('Eukaryota');
  });

});