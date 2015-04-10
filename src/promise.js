var axios = require('axios');
var Q = require('q');
var trees = require('./taxonomy');

module.exports = {
  get: function (local) {
    var src;
    if(local) {
      src = Q(require('../spec/support/taxonomyFixture'));
    }
    else {
      src = axios.get('http://data.gramene.org/taxonomy/select?rows=999999');
    }
    return src
      .then(justTheData)
      .then(taxonomyPromise);
  }
};

function justTheData(json) {
  return Q(json.data.response);
}

function taxonomyPromise(data) {
  return Q.fcall(trees.parseTaxa, data);
}
