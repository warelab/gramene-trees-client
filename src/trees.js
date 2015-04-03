'use strict';

/*
  trees - a module for trees in gramene

*/
module.exports = {
  parseTaxa: function (taxa) {
    var taxonomy={};
    for (var i=0;i<taxa.length; i++) {
      var tax = taxa[i];
      taxonomy[tax._id] = {
        name : tax.name,
        id : tax._id,
        children : []
      };
      if (tax.hasOwnProperty('is_a')) {
        taxonomy[tax._id].parent = tax.is_a[0];
      }
    }
    for(var id in taxonomy) {
      if (taxonomy[id].hasOwnProperty('parent')) {
        var p = taxonomy[id].parent;
        taxonomy[p].children.push(id);
      }
    }
    return taxonomy;
  },
  
  speciesTree: function(taxonomy) {
    // do path compression to hide internal nodes with just one child
    function traverse (tree,id) {
      if (tree[id].children.length === 0) { // leaf node
        return {id:+id,name:tree[id].name};
      }
      var children = [];
      for(var child in tree[id].children) {
        children.push(traverse(tree,tree[id].children[child]));
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
    return traverse(taxonomy,'1');
  },
  
  lca: function(taxonomy, id_list) {
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
}