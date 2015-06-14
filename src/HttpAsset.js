let Cache = require('ya-cache')
let Opts = require('./Opts')
let fetch = require('node-fetch')
let debug = require('debug')('http-asset:HttpAsset')
fetch.Promise = Promise

export default class HttpAsset {
  constructor(url, opts) {
    this.url = url
    this.opts = new Opts(url, opts)

    if (this.opts.cache) {
      this.store = new Cache(this.opts.cachePath)
    }

    this.__active__ = null
  }

  async get() {
    if (this.__active__) return await this.__active__;

    let cache = this.store ? await this.store.get() : {}
    let {ftime, extime} = cache

    let now = Date.now()
    let cached = !!ftime
    let expired = cached && extime && extime < now
    let stale = cached && ftime && now - ftime > this.opts.cacheStaleMs

    if (!cached || expired || stale) {
      let fresh = await this._request(cached ? cache : null)
      if (this.store && (fresh !== cache)) await this.store.sets(fresh)
      return fresh.body
    }

    debug('asset cache is fresh, skipping request')
    return cache.body
  }

  async _request(cache = null) {
    if (this.__active__) return await this.__active__;

    let headers = {}

    if (cache) {
      debug('requesting asset update with cache: %j', cache)
      headers['If-None-Match'] = cache.etag
    }

    this.__active__ = fetch(this.url, {
      method: 'GET',
      headers: headers
    })

    try {
      let res = await this.__active__

      if (cache && res.status === 304) {
        debug('304 - cache is good')
        return cache
      }

      if (res.status === 200) {
        let expires = res.headers.get('expires')
        return {
          body: await res.text(),
          etag: res.headers.get('etag'),
          extime: expires ? Date.parse(expires) : undefined,
          ftime: Date.now()
        }
      }

      throw new Error(`Failed to fetch http asset: ${res.status} - "${this.url}"`)
    } catch (err) {
      // when we have a cache, failure is recoverable
      if (cache) {
        debug('request failure, recovering with cache')
        return cache
      }

      throw err
    } finally {
      this.__active__ = null
    }
  }
}
