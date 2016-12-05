# gramene-trees-client
Provide convenient API for trees. Currently only used for [NCBI taxonomy data](https://www.ncbi.nlm.nih.gov/taxonomy).

[![Build Status](https://travis-ci.org/warelab/gramene-trees-client.svg)](https://travis-ci.org/warelab/gramene-trees-client)
[![MIT License](https://img.shields.io/github/license/mashape/apistatus.svg)](https://img.shields.io/github/license/mashape/apistatus.svg)
[![Platforms](https://img.shields.io/badge/Platforms-macOS%20%7C%20Linux%20%7C%20Windows%20%7C%20node-lightgrey.svg)](https://img.shields.io/badge/Platforms-macOS%20%7C%20Linux%20%7C%20Windows%20%7C%20node-lightgrey.svg)




## Installation
You need to pull down the package via npm. You also can use [yarn](https://github.com/yarnpkg/yarn).

```
npm install gramene-trees-client --save
```

##Usage

###Promises
```javascript
 var  treeLoader = grameneTreesClient.promise;
        treeLoader.get().then(function(taxonomy) {
            console.log(taxonomy.model);
        }).catch(function(error) {
            console.error("Error in getting data: ");
        });
```

Promises-functionality can be obtained from transpilers like [babel.js](https://babeljs.io) or a library like a library like [q](https://github.com/kriskowal/q)


###Await/Async

```javascript
var treeLoader = require("gramene-trees-client").promise;
var taxonomy = await treeLoader.get();

console.log(taxonomy.model)
```

Await/Async functionaltiy can be be obtained from transpilers like [babel.js](https://babeljs.io) or a library like [asyncawait](https://github.com/yortus/asyncawait). Note, with the asyncawait library, the await and async are functions rather than keywords.

**This can be adapted to work in ES2015+ via a transpiler or browsers with native support like in Chrome**
