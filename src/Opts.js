let {path} = require('temp')
let {join} = require('path')
let {tmpDir} = require('os')
let md5 = require('spark-md5').hash
let apply = require('lodash.defaults')

const fiveMinutes = 1000 * 60 * 5

let defaultCacheDir = join(tmpDir(), 'http-asset')
let defaultCachePath = null

export default class Opts {
  constructor(url, defaults) {
    apply(this, defaults, {
      cache: true,
      cacheStaleMs: fiveMinutes
    })

    if (this.cachePath == null) {
      let dir = this.cacheDir == null ? defaultCacheDir : this.cacheDir
      let name = this.cacheName == null ? md5(url) : this.cacheName
      this.cachePath = join(dir, name)
    }
  }
}