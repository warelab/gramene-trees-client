var axios = require('axios');
var Q = require('q');
var taxonomy = require('./taxonomy');

module.exports = {
  get: function (local) {
    var src;
    if(local) {
      src = Q(require('../spec/support/taxonomyFixture'));
    }
    else {
      /*
       id: taxon.id,
       parent: taxon.is_a_is ? taxon.is_a_is[0] : undefined,
       rank: taxon.rank_s || 'not specified',
       name: taxon.name_s,
       synonyms: taxon.synonym_ss || [],
       geneCount: taxon._genes
       */
      src = axios.get('http://data.gramene.org/search/taxonomy?q=*&rows=9999999&fl=id,is_a_is,rank_s,name_s,synonym_ss,_genes');
    }
    return src
      .then(justTheData)
      .then(taxonomyPromise);
  }
};

function justTheData(json) {
  return Q(json.data.response.docs);
}

function taxonomyPromise(data) {
  return Q.fcall(taxonomy.tree, data);
}
