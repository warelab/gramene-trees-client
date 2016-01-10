var TreeModel = require('tree-model');
var _ = require('lodash');
var extensions = require('./treemodelExtensions');

module.exports = {
  tree: function(genetree) {
    function leftIndexComparator(a, b) {
      return a.left_index > b.left_index ? 1 : -1;
    }
    var tree = new TreeModel({modelComparatorFn: leftIndexComparator}).parse(genetree[0]);
    extensions.indexTree(tree, ['protein_stable_id', 'gene_stable_id']);
    extensions.decorateTree(tree);
    extensions.addPrototypeDecorations(tree);
    tree.geneCount = tree.leafNodes().length;
    tree._id = tree.model._id;
    return tree;
  }
}
