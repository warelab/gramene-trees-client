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
      src = axios.get('http://devdata.gramene.org/taxonomy?rows=-1&fl=_id,is_a,property_value,name,synonym,num_genes');
    }
    return src
      .then(justTheData)
      .then(taxonomyPromise);
  }
};

function justTheData(json) {
  return Q(json.data);
}

function taxonomyPromise(data) {
  return Q.fcall(taxonomy.tree, data);
}
