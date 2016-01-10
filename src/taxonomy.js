'use strict';


/*
 trees - a module for trees in gramene

 */
var TreeModel = require('tree-model');
var FlatToNested = require('flat-to-nested');
var _ = require('lodash');
var treemodelExtensions = require('./treemodelExtensions');

module.exports = {
  tree: function (taxonomy) {
    function cleanUpProperties(taxonomy) {
      return taxonomy.map(function (taxon) {
        if (!taxon.is_a) {
          if (taxon._id !== 1) {
            throw new Error('unrooted node!');
          }
        }
        if (taxon.hasOwnProperty('property_value')) {
          taxon.rank = taxon.property_value.replace(/has_rank NCBITaxon:/,'');
        }
        return {
          id: taxon._id,
          parent: taxon.is_a ? taxon.is_a[0] : undefined,
          rank: taxon.rank,
          name: taxon.name,
          synonyms: taxon.synonym || [],
          geneCount: taxon.num_genes
        };
      });
    }

    function createTree(nestedTaxa) {
      function childNodeNameLexComparator(a, b) {
        return a.name > b.name ? 1 : -1;
      }
      function childNodeGeneCountComparator(a, b) {
        return a.geneCount < b.geneCount ? 1 : -1;
      }

      return new TreeModel({modelComparatorFn: childNodeGeneCountComparator}).parse(nestedTaxa);
    }

    function compressTreePaths(tree) {
      tree.all(function (node) {
        return !node.isRoot() && node.children.length === 1;
      }).forEach(function (node) {
        var parent = node.parent
          , child = node.children[0];

        parent.addChild(child);
        node.drop();

        // maintain the link from the compressed node to the parent
        // (this is deleted in call to node.drop())
        node.parent = parent;
        node.compressed = true;

        // Add compressed nodes to child and not parent
        if (!child.compressedNodes) {
          child.compressedNodes = [];
        }
        child.compressedNodes.push(node);
        if (node.compressedNodes) {
          child.compressedNodes = node.compressedNodes.concat(child.compressedNodes);
          delete node.compressedNodes;
        }
      });
    }

    //function decorateTree(tree) {
    //  tree.lca = function lowestCommonAncestor(nodes) {
    //    var parentNodesInCommon = _.chain(nodes)
    //      .map(function (node) {
    //        return node.getPath();
    //      })
    //      .reduce(function (acc, nextPath) {
    //        return _.intersection(acc, nextPath)
    //      })
    //      .value();
    //    return parentNodesInCommon.pop();
    //  };
    //
    //  tree.pathBetween = function pathBetweenNodes(from, to) {
    //
    //    var lca, fromPath, toPath, fromLcaIdx, toLcaIdx, pathBetween;
    //
    //    // find the lowest commen ancestor
    //    lca = tree.lca([from, to]);
    //
    //    // get the full path from -> root, and reverse it
    //    fromPath = _(from.getPath().reverse());
    //
    //    // get the full path to -> root
    //    toPath = _(to.getPath());
    //
    //    // find the index of lca in fromPath and toPath
    //    fromLcaIdx = fromPath.findIndex(lca);
    //    toLcaIdx = toPath.findIndex(lca);
    //
    //    // slice and combine the arrays to get the path between
    //    pathBetween = fromPath.slice(0, fromLcaIdx).concat(toPath.slice(toLcaIdx).value());
    //
    //    return pathBetween.value();
    //  };
    //}
    //
    //function addPrototypeDecorations(tree) {
    //  var prototree = Object.getPrototypeOf(tree);
    //
    //  prototree.depth = function calculateEffectiveNodeDepth(includeCompressedNodes) {
    //    var path = this.getPath()
    //      , depth = path.length - 1
    //      , compressedDepth;
    //
    //    if(includeCompressedNodes) {
    //      compressedDepth = _.reduce(path, function (acc, n) {
    //        return acc + (n.compressedNodes ? n.compressedNodes.length : 0);
    //      }, 0);
    //      depth += compressedDepth;
    //    }
    //
    //    return depth;
    //  };
    //
    //  prototree.pathTo = function(to) {
    //    return tree.pathBetween(this, to);
    //  };
    //
    //  prototree.leafNodes = function findAllLeafNodes() {
    //    return this.all(function (node) { return !node.hasChildren(); });
    //  };
    //
    //  prototree.lcaWith = function(otherNodes) {
    //    var nodes = _.clone(otherNodes);
    //    nodes.push(this);
    //    return tree.lca(nodes);
    //  }
    //}
    //
    //function indexTree(tree, attrs) {
    //  tree.indices = _.chain(attrs)
    //    .map(function (attr) {
    //      var result = {_attr: attr};
    //      tree.walk(function (node) {
    //        result[node.model[attr]] = node;
    //      });
    //      return result;
    //    })
    //    .indexBy('_attr')
    //    .value();
    //}

    var taxa
      , nestedTaxa
      , tree;

    taxa = cleanUpProperties(taxonomy);
    nestedTaxa = new FlatToNested().convert(taxa);
    tree = createTree(nestedTaxa);
    treemodelExtensions.indexTree(tree, ['id', 'name']);
    compressTreePaths(tree);
    treemodelExtensions.decorateTree(tree);
    treemodelExtensions.addPrototypeDecorations(tree);

    return tree;
  }
};