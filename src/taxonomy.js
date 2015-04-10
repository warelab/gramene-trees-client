'use strict';


/*
 trees - a module for trees in gramene

 */
var TreeModel = require('tree-model');
var FlatToNested = require('flat-to-nested');
var _ = require('lodash');

module.exports = {
  modelRoot: function (taxonomy) {

    function cleanUpProperties(taxonomy) {
      return taxonomy.map(function (taxon) {
        if (!taxon.is_a) {
          if (taxon._id !== 1) {
            throw new Error('unrooted node!');
          }
        }

        return {
          id: taxon._id,
          parent: taxon.is_a ? taxon.is_a[0] : undefined,
          rank: taxon.property_value ? taxon.property_value.substring(19) : 'not specified',
          name: taxon.name,
          synonyms: taxon.synonym || []
        };
      });
    }

    function createTree(nestedTaxa) {
      function childNodeNameLexComparator(a, b) {
        return a.name > b.name ? 1 : -1;
      }

      return new TreeModel({modelComparatorFn: childNodeNameLexComparator}).parse(nestedTaxa);
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

    function decorateTree(tree) {
      tree.depth = function calculateEffectiveNodeDepth(node) {
        var path = node.getPath()
          , depth = path.length - 1
          , compressedDepth = _.reduce(path, function (acc, n) {
            return acc + (n.compressedNodes ? n.compressedNodes.length : 0);
          }, 0);

        return depth + compressedDepth;
      };

      tree.leafNodes = function findAllLeafNodes() {
        return tree.all(function (node) { return !node.hasChildren(); });
      };

      tree.lca = function lowestCommonAncestor(nodes) {
        var parentNodesInCommon = nodes
          .map(function (node) {
            return node.getPath(); // .map(function (n) { return n.model.id });
          })
          .reduce(function (acc, nextPath) {
            return _.intersection(acc, nextPath)
          });
        return parentNodesInCommon.pop();
      }
    }

    function indexTree(tree, attrs) {
      tree.indices = _.chain(attrs)
        .map(function (attr) {
          var result = {_attr: attr};
          tree.walk(function (node) {
            result[node.model[attr]] = node;
          });
          return result;
        })
        .indexBy('_attr')
        .value();
    }

    var taxa
      , nestedTaxa
      , tree;

    taxa = cleanUpProperties(taxonomy);
    nestedTaxa = new FlatToNested().convert(taxa);
    tree = createTree(nestedTaxa);
    indexTree(tree, ['id', 'name']);
    compressTreePaths(tree);
    decorateTree(tree);

    return tree;
  },

  parseTaxa: function (taxa) {
    var taxonomy = {};
    for (var i = 0; i < taxa.length; i++) {
      var tax = taxa[i];
      taxonomy[tax._id] = {
        name: tax.name,
        id: tax._id,
        children: []
      };
      if (tax.hasOwnProperty('is_a')) {
        taxonomy[tax._id].parent = tax.is_a[0];
      }
    }
    for (var id in taxonomy) {
      if (taxonomy[id].hasOwnProperty('parent')) {
        var p = taxonomy[id].parent;
        taxonomy[p].children.push(id);
      }
    }
    return taxonomy;
  },

  speciesTree: function (taxonomy) {
    // do path compression to hide internal nodes with just one child
    function traverse(tree, id) {
      if (tree[id].children.length === 0) { // leaf node
        return {id: +id, name: tree[id].name};
      }
      var children = [];
      for (var child in tree[id].children) {
        children.push(traverse(tree, tree[id].children[child]));
      }
      if (tree[id].children.length > 1) { // branching happens here
        return {
          id: +id,
          name: tree[id].name,
          children: children
        };
      }
      if (tree[id].children.length === 1) {
        return children[0];
      }
    }

    return traverse(taxonomy, '1');
  },

  lca: function (taxonomy, id_list) {
    // find the lowest common ancestor for a given list of taxonomy ids.
    var id = id_list.shift();
    var path = [id];
    var idx = {};
    idx[id] = 0;
    while (taxonomy[id].hasOwnProperty('parent')) {
      id = taxonomy[id].parent;
      idx[id] = path.length;
      path.push(id);
    }
    var lca = 0;
    for (var i in id_list) {
      id = id_list[i];
      while (!idx.hasOwnProperty(id)) {
        id = taxonomy[id].parent;
      }
      if (lca < idx[id]) lca = idx[id];
    }
    return taxonomy[path[lca]];
  }
};