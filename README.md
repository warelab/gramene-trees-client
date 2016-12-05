# gramene-trees-client
Provide convenient API for trees. Currently only used for NCBI taxonomy data.

[![Build Status](https://travis-ci.org/warelab/gramene-trees-client.svg)](https://travis-ci.org/warelab/gramene-trees-client)

## Installation

On Max OSX:

1. Install [Homebrew](http://brew.sh)

2. Install `nvm` and then `node`:

```
brew install nvm
nvm install stable
```

```
npm install gramene-trees-client --save
```

##Usage

###Promises
```
 var  treeLoader = grameneTreesClient.promise;
        treeLoader.get().then(function(taxonomy) {
            console.log(taxonomy.model);
        }).catch(function(error) {
            console.error("Error in getting data: ");
        });
```

Promises-functionality can be obtained from transpilers like [babel.js](https://babeljs.io) or a library like a library like [q](https://github.com/kriskowal/q)


###Await/Async

```
var treeLoader = require("gramene-trees-client").promise;
var taxonomy = await treeLoader.get();

console.log(taxonomy.model)
```

Await/Async functionaltiy can be be obtained from transpilers like [babel.js](https://babeljs.io) or a library like [asyncawait](https://github.com/yortus/asyncawait). Note, with the asyncawait library, the await and async are functions rather than keywords.

**This can be adapted to work in ES2015+ via a transpiler or browser with native support like in Chrome**
