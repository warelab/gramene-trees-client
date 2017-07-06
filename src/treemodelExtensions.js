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
    else if (testNode(source)) {
      var leaf = _.clone(source.model);
      return treeModel.parse(leaf);
    }
    return false;
  }

  // var model = _.clone(tree.model);
  // delete model.children;
  // var root = treeModel.parse(model);
  var root = pruneChildren(tree);
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
  var gapCode = '-'.charCodeAt(0);
  for(var i=0; i<seqA.length; i++) {
    totalCnt++;
    if (seqA[i] === seqB[i]) {
      if (seqA[i] === gapCode) totalCnt--;
      else matchCnt++;
    }
  }
  return matchCnt/totalCnt;
}

function cigarToConsensus(cigar, seq) {

  var pieces = cigar.split(/([DM])/);
  var clength=0;
  var stretch=0;
  pieces.forEach(function (piece) {
    if (piece === "M" || piece === "D") {
      if (stretch === 0) stretch = 1;
      clength += stretch;
    }
    else {
      stretch = +piece;
    }
  });
  stretch = 0;
  var size = 0;
  var gap = '-'.charCodeAt(0);
  var alignseq = new Uint16Array(clength);
  var frequency = new Uint16Array(clength);
  alignseq.fill(gap);
  var offset=0;
  pieces.forEach(function (piece) {
    if (piece === "M") {
      if (stretch === 0) stretch = 1;
      frequency.fill(1,offset,offset + stretch);
      for(var i=0;i<stretch;i++) {
        alignseq[offset++] = seq.charCodeAt(size + i);
      }
      size += stretch;
      stretch = 0;
    }
    else if (piece === "D") {
      if (stretch === 0) stretch = 1;
      offset += stretch;
      stretch = 0;
    }
    else if (!!piece) {
      stretch = +piece;
    }
  });
  return {sequence: alignseq, frequency: frequency, nSeqs: 1, consensusLength: clength};
}

function addConsensus(tree) {
  // generate a consensus for each node in the tree
  // the consensus is a string and an array of frequencies (gap frequencies are always 0)
  // for leaf nodes use the sequence and cigar attributes to define the node's consensus
  // for internal nodes (2 children) select the consensus based on the frequency in the child nodes
  // todo: try run-length encoding to save memory?
  if (tree.model.consensus) return;

  function mergeConsensi(A,B) {
    var res = _.cloneDeep(A);
    const len = A.sequence.length;
    res.nSeqs += B.nSeqs;
    for(var i=0; i<len; i++) {
      if (B.sequence[i] === res.sequence[i]) {
        res.frequency[i] += B.frequency[i];
      }
      else if (B.frequency[i] > res.frequency[i]) {
        res.frequency[i] = B.frequency[i];
        res.sequence[i] = B.sequence[i];
      }
    }
    return res;
  }

  function addConsensusToNode(node) {
    if (node.model.sequence && node.model.cigar) {
      node.model.consensus = cigarToConsensus(node.model.cigar, node.model.sequence);
    }
    else {
      addConsensusToNode(node.children[0]);
      addConsensusToNode(node.children[1]);
      node.model.consensus = mergeConsensi(node.children[0].model.consensus, node.children[1].model.consensus);
    }
  }

  addConsensusToNode(tree);
  removeGaps(tree);
}

function removeGaps(tree) {
  // if there are gaps in the tree root's consensus, identify them and remove them from the rest of the tree
  // remove gaps from the consensus, and from the cigar string in the leaf nodes (maybe ?)
  const msaLength = tree.model.consensus.frequency.length;
  var nonGapStarts = [];
  var nonGapLengths = [];
  var nonGapStart = 0;
  var nonGapLength = 0;
  var totalLength = 0;
  for (var i = 0; i < msaLength; i++) {
    if (tree.model.consensus.frequency[i] > 0) {
      if (i === nonGapStart + nonGapLength) { // extending a non-gap
        nonGapLength++;
      }
      else { // start of a new non-gap
        nonGapStart = i;
        nonGapLength = 1;
      }
    }
    else { // gap position
      if (nonGapLength) {
        totalLength += nonGapLength;
        nonGapStarts.push(nonGapStart);
        nonGapLengths.push(nonGapLength);
        nonGapLength = 0;
      }
    }
  }
  if (nonGapLength) {
    totalLength += nonGapLength;
    nonGapStarts.push(nonGapStart);
    nonGapLengths.push(nonGapLength);
  }

  if (totalLength < msaLength) {
    function removeGapsFromNode(node) {
      var consensus = {
        nSeqs: node.model.consensus.nSeqs,
        consensusLength: totalLength,
        sequence: new Uint16Array(totalLength),
        frequency: new Uint16Array(totalLength)
      };
      var srcSeqBuffer = node.model.consensus.sequence.buffer;
      var srcFreqBuffer = node.model.consensus.frequency.buffer;
      var dstSeqBuffer = consensus.sequence.buffer;
      var dstFreqBuffer = consensus.frequency.buffer;
      var dstOffset = 0;
      for(var i=0; i<nonGapStarts.length; i++) {
        var srcOffset = 2*nonGapStarts[i];
        var lengthInBytes = 2*nonGapLengths[i];
        var srcU8 = new Uint8Array(srcSeqBuffer, srcOffset, lengthInBytes);
        var dstU8 = new Uint8Array(dstSeqBuffer, dstOffset, lengthInBytes);
        dstU8.set(srcU8);
        srcU8 = new Uint8Array(srcFreqBuffer, srcOffset, lengthInBytes);
        dstU8 = new Uint8Array(dstFreqBuffer, dstOffset, lengthInBytes);
        dstU8.set(srcU8);
        dstOffset += lengthInBytes;
      }
      node.model.consensus = consensus;
      node.children.forEach(function (child) {
        removeGapsFromNode(child);
      });
    }
    removeGapsFromNode(tree);
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