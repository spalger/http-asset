# http-asset

Fetch, cache, and update some asset over http.

Useful for managing things like lists or manifest that are stored somewhere else but needed regularly. Used by [esvm](https://www.npmjs.com/package/esvm) to download the list of available elasticsearch releases.

## features

 - filesystem backed caching of asset
 - utilizes http caching headers
 - falls back to cache on failure (offline support I guess?)

## example

```js
let HttpAsset = require('http-asset')
let asset = HttpAsset('https://api.github.com/repos/elastic/elasticsearch/tags?per_page=100')
asset.get().then(labels => {
  // use labels
})
```

## api

---
#### `new HttpAsset(url, options = {})`

Construct an asset object. `url` is where the asset should be downloaded from, options include:

| option         | default                      | description                             |
| ------         | -------                      | -----------                             |
| `cache`        | `true`                       | Set to true to disable caching          |
| `cacheStaleMs` | `1000 * 60 * 5` (5 minutes)  | number of milliseconds before we should check for an update |
| `cacheDir`     | `os.tmpDir()`                | Directory to store this asset's cache   |
| `cacheName`    | `md5(url)`                   | Filename for the cache                  |
| `cachePath`    | `cacheDir` + `cacheName`     | Override the cache path for this asset  |

---
#### `asset.get() -> Promise`

Get the body of a asset, returns a promise

```js
let HttpAsset = require('http-asset')
let asset = HttpAsset('https://api.github.com/repos/elastic/elasticsearch/tags?per_page=100')
asset.get().then(labels => {
  // use labels
})
```

---
#### `asset.clear() -> Promise`

Clears the value of the asset

```js
// force a fetch
asset.clear().then(function () {
  return asset.get()
})
```