let {path} = require('temp')
let {join} = require('path')
let {tmpDir} = require('os')
let checksum = require('checksum')

const fiveMinutes = 1000 * 60 * 5

let defaultCacheDir = join(tmpDir(), 'http-asset')
let defaultCachePath = null

export default class Opts {
  constructor(url, overrides) {
    this.id = null
    this.cache = true
    this.cachePath = null
    this.cacheStaleMs = fiveMinutes
    this.serveStaleOnFail = true

    Object.assign(this, overrides)

    if (!this.id) {
      this.id = checksum(url)
    }

    if (this.cachePath === null) {
      this.cachePath = defaultCachePath || join(defaultCacheDir, this.id)
    }
  }

  static set __defaultCachePath__(dir) {
    defaultCachePath = dir
  }
}