var axios = require('axios');
var Q = require('q');
var genomeFixture = require('../support/taxonomyFixture');

describe('TaxonomyPromise', function() {

  var taxonomyPromiser, expectedResult;

  beforeEach(function() {
    taxonomyPromiser = require('../../src/promise');
    expectedResult = Q(genomeFixture);

    spyOn(axios, 'get').andReturn(expectedResult);
  });

  it('should work with local data file', function() {
    taxonomyPromiser.get(true).then(function(tree) {
      expect(tree).toBeDefined();
    }).catch(function(error) {
      expect(error).toBeUndefined();
    });
  });

  it('should request data from http://data.gramene.org/search/taxonomy', function() {
    // when
    taxonomyPromiser.get();

    // then
    expect(axios.get.mostRecentCall.args[0]).toEqual('http://data.gramene.org/search/taxonomy?q=*&rows=9999999&fl=id,is_a_is,rank_s,name_s,synonym_ss,_genes');
  });

  it('should return a tree', function() {
    // when
    var taxonomyFunctions = taxonomyPromiser.get();
    var iWasCalled = false;

    function checkTheThingReturnedIsTheRightShape(tree) {
      // then
      iWasCalled = true;
      expect(tree).toBeDefined();
      return tree;
    }

    function thereShouldBeNoErrors(error) {
      expect(error).toBeUndefined();
    }

    function ensureTestResultCalled() {
      return iWasCalled;
    }

    taxonomyFunctions.then(checkTheThingReturnedIsTheRightShape)
      .catch(thereShouldBeNoErrors);

    waitsFor(ensureTestResultCalled, 'the taxonomy functions to be created', 5000);
  });
});