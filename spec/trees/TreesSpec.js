describe('Trees', function () {
  // json response to http://data.gramene.org/taxonomy/select?rows=-1
  // converted into a commonJS module by prepending json doc with
  // `module.exports = `
  var taxonomy = require('../support/taxonomy.js');
  var trees = require('../../src/trees');
  var tax_tree = trees.parseTaxa(taxonomy.data.response);
  var stree = trees.speciesTree(tax_tree);

  it('lca should find the lowest common ancestor', function () {
    // when
    var ath = trees.lca(tax_tree, [3702]);
    var arabidopsis = trees.lca(tax_tree, [3702,81972]);
    var rosids = trees.lca(tax_tree, [3702,29760]);
    var oryza = trees.lca(tax_tree, [39947,4528,4538]);
    var poaceae = trees.lca(tax_tree, [39947,4528,4538,4577]);

    expect(ath.id).toEqual(3702);
    expect(arabidopsis.id).toEqual(3701);
    expect(rosids.id).toEqual(71275);
    expect(oryza.id).toEqual(4527);
    expect(poaceae.id).toEqual(4479);
  });

});