var _ = require('lodash');
var TreeModel = require('tree-model');

function decorateTree(tree) {
  tree.lca = function lowestCommonAncestor(nodes) {
    var parentNodesInCommon = _.chain(nodes)
      .map(function (node) {
        if(!node || !_.isFunction(node.getPath)) {
          throw new Error('Cannot calculate lca with a null node');
        }
        return node.getPath();
      })
      .reduce(function (acc, nextPath) {
        return _.intersection(acc, nextPath)
      })
      .value();
    return parentNodesInCommon.pop();
  };

  tree.pathBetween = function pathBetweenNodes(from, to) {

    var lca, fromPath, toPath, fromLcaIdx, toLcaIdx, pathBetween;

    // find the lowest commen ancestor
    lca = tree.lca([from, to]);

    // get the full path from -> root, and reverse it
    fromPath = _(from.getPath().reverse());

    // get the full path to -> root
    toPath = _(to.getPath());

    // find the index of lca in fromPath and toPath
    fromLcaIdx = fromPath.findIndex(lca);
    toLcaIdx = toPath.findIndex(lca);

    // slice and combine the arrays to get the path between
    pathBetween = fromPath.slice(0, fromLcaIdx).concat(toPath.slice(toLcaIdx).value());

    return pathBetween.value();
  };
}

function addPrototypeDecorations(tree) {
  var prototree = Object.getPrototypeOf(tree);

  if(!shouldDecorateTreePrototype(prototree)) {
    return;
  }

  prototree.depth = function calculateEffectiveNodeDepth(includeCompressedNodes) {
    var path = this.getPath()
      , depth = path.length - 1
      , compressedDepth;

    if(includeCompressedNodes) {
      compressedDepth = _.reduce(path, function (acc, n) {
        return acc + (n.compressedNodes ? n.compressedNodes.length : 0);
      }, 0);
      depth += compressedDepth;
    }

    return depth;
  };

  prototree.pathTo = function(to) {
    return tree.pathBetween(this, to);
  };

  prototree.leafNodes = function findAllLeafNodes() {
    return this.all(function (node) { return !node.hasChildren(); });
  };

  prototree.lcaWith = function(otherNodes) {
    var nodes = _.clone(otherNodes);
    nodes.push(this);
    return tree.lca(nodes);
  };

  prototree.filterWalk = function (callback) {
    function filterWalkRecursive(node) {
      var evaluateChildren = callback(node);
      if(evaluateChildren && _.isArray(node.children)) {
        _.forEach(node.children, filterWalkRecursive)
      }
    }
    return filterWalkRecursive(this);
  }
}

function shouldDecorateTreePrototype(prototype) {
  return !(
    _.isFunction(prototype.depth) &&
    _.isFunction(prototype.pathTo) &&
    _.isFunction(prototype.leafNodes) &&
    _.isFunction(prototype.lcaWith)
  )
}

function indexTree(tree, attrs) {
  tree.indices = _.chain(attrs)
    .map(function (attr) {
      var result = {_attr: attr};
      tree.walk(function (node) {
        var key = node.model[attr];
        if(! _.isUndefined(key) ) {
          result[key] = node;
        }
      });
      return result;
    })
    .indexBy('_attr')
    .value();
}

function pruneTree(tree, testNode) {
  
  function possiblyAddChildren(source, dest) {
    if (source.hasChildren()) {
      var shouldAdd = testNode(source); // check the children either way
      source.children.forEach(function(sourceChild) {
        var model = _.clone(sourceChild.model);
        delete model.children;
        var destChild = treeModel.parse(model);
        if (possiblyAddChildren(sourceChild, destChild)) {
          dest.addChild(destChild);
          shouldAdd = true;
        }
      });
      return shouldAdd;
    }
    else if (testNode(source)) {
      return true;
    }
    return false;
  }

  var treeModel = new TreeModel({modelComparatorFn: tree.config.modelComparatorFn});
  var model = _.clone(tree.model);
  delete model.children;
  var root = treeModel.parse(model);
  possiblyAddChildren(tree, root);
  
  if (tree.indices) {
    indexTree(root, Object.keys(tree.indices));
  }
  decorateTree(root);
  addPrototypeDecorations(root);
  
  return root;
}

module.exports = {
  decorateTree: decorateTree,
  addPrototypeDecorations: addPrototypeDecorations,
  indexTree: indexTree,
  pruneTree: pruneTree
};