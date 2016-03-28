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
        var deferred, params;
        deferred = Q.defer();
        params = {
          rows: -1,
          subset: 'gramene',
          fl: ['_id', 'is_a', 'property_value', 'name', 'synonym', 'num_genes']};
        client['Data access'].taxonomy(params, function(response) {
          response.client = client;
          deferred.resolve(response);
        });
        return deferred.promise;
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
