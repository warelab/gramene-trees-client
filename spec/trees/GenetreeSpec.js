describe('Genetrees', function () {
  // json response to http://data.gramene.org/taxonomy/select?rows=-1
  // converted into a commonJS module by prepending json doc with
  // `module.exports = `
  var fixture = require('../support/genetreeFixture.json');
  var genetree = require('../../src/genetree');

  var root;

  beforeEach(function () {
    root = genetree.tree(fixture);
  });

  it('should populate treemodel api', function () {
    expect(root).toBeDefined();
    expect(root.isRoot()).toBeTruthy();
    expect(root.hasChildren()).toBeTruthy();
  });

  it('should have 149 species and an _id property', function () {
    // when
    var leaves = root.leafNodes();

    // then
    expect(leaves.length).toEqual(149);
    expect(root.geneCount).toEqual(149);
    expect(root._id).toEqual('EPlGT00140000001539');
  });

  it('should find gene id in index', function() {
    // given
    var index = root.indices.gene_stable_id;
    var geneId = 'AT3G52430';

    // when
    var gene = index[geneId];

    // then
    expect(gene).toBeDefined();
    expect(gene.children.length).toEqual(0);
    expect(gene.model).toBeDefined();
    expect(gene.model.gene_stable_id).toEqual(geneId);
  });

  it('should sort child nodes by left index', function () {
    // when we get all nodes with >1 child
    var multipleChildrenNodes = root.all(function (n) {
      return n.children.length > 1;
    });

    multipleChildrenNodes.map(function(node) {
      var children = node.children,
        aL,
        bL,
        aR,
        bR;
      for(var i = 1; i < children.length; i++) {
        aL = children[i-1].model.left_index;
        bL = children[i].model.left_index;
        aR = children[i-1].model.right_index;
        bR = children[i].model.right_index;

        expect(aL < bL).toBeTruthy(aL + ' should precede ' + bL);
        expect(aL < aR).toBeTruthy(aL + ' should precede ' + aR);
        expect(aR - bL === -1).toBeTruthy(aR + ' should immediately precede ' + bL);
        expect(bL < bR).toBeTruthy(bL + ' should precede ' + bR);
      }
    });
  });

});
