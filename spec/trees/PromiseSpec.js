var Q = require('q');
var genomeFixture = require('../support/taxonomyFixture');

global.gramene = { defaultServer: 'http://data.gramene.org/v50/swagger' };

var client = require('gramene-search-client').client.grameneClient;


describe('TaxonomyPromise', function() {

  var taxonomyPromiser, expectedResult;

  beforeEach(function() {
    taxonomyPromiser = require('../../src/promise');
    expectedResult = Q(genomeFixture);

    spyOn(client, 'then').andCallThrough();
  });

  it('should work with local data file', function() {
    taxonomyPromiser.get(true).then(function(tree) {
      expect(tree).toBeDefined();
    }).catch(function(error) {
      expect(error).toBeUndefined();
    });
  });

  it('should return a tree', function() {
    // when
    var taxonomyFunctions = taxonomyPromiser.get();
    var iWasCalled = false;

    function checkTheThingReturnedIsTheRightShape(tree) {
      // then
      iWasCalled = true;
      expect(tree).toBeDefined();
      expect(tree.all().length).toEqual(68);
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