var _ = require('lodash');
var TreeModel = require('tree-model');

function decorateTree(tree) {
  tree.lca = function lowestCommonAncestor(nodes) {
    var parentNodesInCommon = _.chain(nodes)
      .map(function (node) {
        if (!node || !_.isFunction(node.getPath)) {
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

  if (!shouldDecorateTreePrototype(prototree)) {
    return;
  }

  prototree.depth = function calculateEffectiveNodeDepth(includeCompressedNodes) {
    var path = this.getPath()
      , depth = path.length - 1
      , compressedDepth;

    if (includeCompressedNodes) {
      compressedDepth = _.reduce(path, function (acc, n) {
        return acc + (n.compressedNodes ? n.compressedNodes.length : 0);
      }, 0);
      depth += compressedDepth;
    }

    return depth;
  };

  prototree.pathTo = function (to) {
    return tree.pathBetween(this, to);
  };

  prototree.leafNodes = function findAllLeafNodes() {
    return this.all(function (node) {
      return !node.hasChildren();
    });
  };

  prototree.lcaWith = function (otherNodes) {
    var nodes = _.clone(otherNodes);
    nodes.push(this);
    return tree.lca(nodes);
  };

  prototree.filterWalk = function (callback) {
    function filterWalkRecursive(node) {
      var evaluateChildren = callback(node);
      if (evaluateChildren && _.isArray(node.children)) {
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
        if (!_.isUndefined(key)) {
          result[key] = node;
        }
      });
      return result;
    })
    .indexBy('_attr')
    .value();
}

function pruneTree(tree, testNode) {
  var treeModel = new TreeModel({modelComparatorFn: tree.config.modelComparatorFn});

  function pruneChildren(source) {
    if (source.hasChildren()) {
      var shouldAdd = testNode(source);
      var kids=[];
      source.children.forEach(function (sourceChild) {
        var destChild = pruneChildren(sourceChild);
        if (destChild) kids.push(destChild);
      });
      if (shouldAdd || kids.length > 0) {
        if (kids.length === 1) {
          kids[0].model.distance_to_parent += source.model.distance_to_parent;
          return kids[0];
        }
        else {
          // create a new node and add the kids to it
          var model = _.clone(source.model);
          delete model.children;
          var parent = treeModel.parse(model);
          kids.forEach(function (k) {
            parent.addChild(k);
          });
          return parent;
        }
      }
    }
    else if (testNode(source)) {let
      var leaf = _.clone(source.model);
      return treeModel.parse(leaf);
    }
    return false;
  }

  // var model = _.clone(tree.model);
  // delete model.children;
  // var root = treeModel.parse(model);
  var root = pruneChildren(tree); //, root);
  if (!root.model._id) {
    root.model._id = tree.model._id;
    root.model.tree_stable_id = tree.model.tree_stable_id;
  }
  if (tree.indices) {
    indexTree(root, Object.keys(tree.indices));
  }
  decorateTree(root);
  addPrototypeDecorations(root);

  return root;
}

function identity(geneA, geneB) {
  if (geneA === geneB) {
    return 1;
  }

  if (! geneA.model.consensus) {
    geneA.model.consensus = cigarToConsensus(geneA.model.cigar, geneA.model.sequence);
  }
  if (! geneB.model.consensus) {
    geneB.model.consensus = cigarToConsensus(geneB.model.cigar, geneB.model.sequence);
  }

  var seqA = geneA.model.consensus.sequence;
  var seqB = geneB.model.consensus.sequence;
  if (seqA.length !== seqB.length) {
    console.error('alignment sequences are not the same length');
    return 0;
  }

  var matchCnt = 0;
  var totalCnt = 0;
  for(var i=0; i<seqA.length; i++) {
    totalCnt++;
    if (seqA[i] === seqB[i]) {
      if (seqA[i] === '-') totalCnt--;
      else matchCnt++;
    }
  }
  return matchCnt/totalCnt;
}

function cigarToConsensus(cigar, seq) {

  var pieces = cigar.split(/([DM])/);
  var size = 0;
  var stretch = 0;
  var alignseq = "";
  var frequency = [];

  pieces.forEach(function (piece) {
    if (piece === "M") {
      if (stretch === 0) stretch = 1;
      alignseq += seq.substr(size, stretch);
      size += stretch;
      for (i = 0; i < stretch; i++) {
        frequency.push(1);
      }
      stretch = 0;
    }
    else if (piece === "D") {
      if (stretch === 0) stretch = 1;
      alignseq += '-'.repeat(stretch);
      for (i = 0; i < stretch; i++) {
        frequency.push(0);
      }
      stretch = 0;
      //size += stretch;
      stretch = 0;
    }
    else if (!!piece) {
      stretch = +piece;
    }
  });
  return {sequence: alignseq.split(''), frequency: frequency};
}

function addConsensus(tree) {
  // generate a consensus for each node in the tree
  // the consensus is a string and an array of frequencies (gap frequencies are always 0)
  // for leaf nodes use the sequence and cigar attributes to define the node's consensus
  // for internal nodes (2 children) select the consensus based on the frequency in the child nodes
  if (tree.model.consensus) return;

  function addConsensusToNode(node) {
    if (node.model.sequence && node.model.cigar) {
      // parse the cigar string and generate a consensus sequence
      node.model.consensus = cigarToConsensus(node.model.cigar, node.model.sequence);
    }
    else {
      node.children.forEach(function (child) {
        addConsensusToNode(child);
        if (!node.model.consensus) {
          node.model.consensus = _.cloneDeep(child.model.consensus)
        }
        else {
          for (var i = 0; i < child.model.consensus.sequence.length; i++) {
            if (child.model.consensus.sequence[i] === node.model.consensus.sequence[i]) {
              node.model.consensus.frequency[i] += child.model.consensus.frequency[i];
            }
            else if (child.model.consensus.frequency[i] > node.model.consensus.frequency[i]) {
              node.model.consensus.frequency[i] = child.model.consensus.frequency[i];
              node.model.consensus.sequence[i] = child.model.consensus.sequence[i];
            }
            else {

            }
          }
        }
      });
    }
  }

  addConsensusToNode(tree);
  removeGaps(tree);
}

function removeGaps(tree) {
  // if there are gaps in the tree root's consensus, identify them and remove them from the rest of the tree
  // remove gaps from the consensus, and from the cigar string in the leaf nodes (maybe ?)
  var msaLength = tree.model.consensus.frequency.length;
  var noGapSequence = [];
  var noGapFrequency = [];
  var isGap = [];
  for (var i = 0; i < msaLength; i++) {
    if (tree.model.consensus.frequency[i] > 0) {
      noGapSequence.push(tree.model.consensus.sequence[i]);
      noGapFrequency.push(tree.model.consensus.frequency[i]);
      isGap[i] = false;
    }
    else {
      isGap[i] = true;
    }
  }
  if (noGapFrequency.length < msaLength) { // we actually removed some gaps
    tree.model.consensus.frequency = noGapFrequency;
    tree.model.consensus.sequence = noGapSequence;
    function removeGapsFromChildren(node) {
      node.children.forEach(function (child) {
        var noGapSequence = [];
        var noGapFrequency = [];
        for (var i = 0; i < child.model.consensus.sequence.length; i++) {
          if (!isGap[i]) {
            noGapSequence.push(child.model.consensus.sequence[i]);
            noGapFrequency.push(child.model.consensus.frequency[i]);
          }
        }
        child.model.consensus.sequence = noGapSequence;
        child.model.consensus.frequency = noGapFrequency;
        if (child.children) {
          removeGapsFromChildren(child);
        }
      });
    }

    removeGapsFromChildren(tree);
  }
}

module.exports = {
  decorateTree: decorateTree,
  addPrototypeDecorations: addPrototypeDecorations,
  indexTree: indexTree,
  pruneTree: pruneTree,
  addConsensus: addConsensus,
  identity: identity
};