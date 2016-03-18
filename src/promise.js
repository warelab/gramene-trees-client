'use strict';

var grameneClient = require('gramene-search-client').client.grameneClient;
var validateFactory = require('gramene-search-client').client.validate;
var Q = require('q');
var taxonomy = require('./taxonomy');

module.exports = {
  get: function (local) {
    var src;
    if(local) {
      src = Q(require('../spec/support/taxonomyFixture'));
    }
    else {
      src = grameneClient.then(function(client) {
        var params = {rows: -1, fl: ['_id', 'is_a', 'property_value', 'name', 'synonym', 'num_genes']};
        return client['Data access'].taxonomy(params).then(function(response) {
          response.client = client;
          return response;
        });
      });
    }
    return src
      .then(validateFactory('TaxonomyResponse'))
      .then(justTheData)
      .then(taxonomyPromise);
  }
};

function justTheData(json) {
  return Q(json.obj);
}

function taxonomyPromise(data) {
  return Q.fcall(taxonomy.tree, data);
}
