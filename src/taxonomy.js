'use strict';


/*
 trees - a module for trees in gramene

 */
var TreeModel = require('tree-model');
var FlatToNested = require('flat-to-nested');
var _ = require('lodash');

module.exports = {
  tree: function (taxonomy) {
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
        var parentNodesInCommon = _.chain(nodes)
          .map(function (node) {
            return node.getPath(); // .map(function (n) { return n.model.id });
          })
          .reduce(function (acc, nextPath) {
            return _.intersection(acc, nextPath)
          })
          .value();
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
  }
};