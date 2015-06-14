describe('HttpAsset', ()=> {
  let {parse} = require('url')
  let {existsSync, unlinkSync} = require('fs')

  let HttpAsset = require('../HttpAsset')
  let MockServer = require('../../test/MockServer')

  let cachePath = __dirname + '/__cache__'
  require('../Opts').__defaultCachePath__ = cachePath

  let clear = ()=> existsSync(cachePath) && unlinkSync(cachePath)
  let url = (path) => 'http://localhost:8888' + path
  let delay = n => new Promise(resolve => setTimeout(resolve, n))

  let server;
  before(()=> {
    server = new MockServer()
    return server.listen(8888)
  })

  beforeEach(()=> server.reset())
  beforeEach(clear)

  after(()=> server.close())
  after(()=> clear)

  describe('#get()', ()=> {

    it('supports basic requests', async ()=> {
      server.files.set('/jquery', 'b-b-b-body')
      let asset = new HttpAsset(url('/jquery'), { cache: false })
      let body = await asset.get()
      body.should.eql('b-b-b-body')
    })

    it('coalesces multiple calls to get', async ()=> {
      server.files.set('/call-me-maybe', 'hi')

      let asset = new HttpAsset(url('/call-me-maybe'), { cache: false })
      await Promise.all([
        asset.get(),
        asset.get(),
        asset.get(),
        asset.get()
      ])

      server.log.should.have.length(1)
    })

    it('returns original response for cacheStaleMs after request', async ()=> {
      server.files.set('/refresh-cache', function ({req, res}) {
        res.status = 200
        res.body = Date.now() + ''
      })

      let asset = new HttpAsset(url('/refresh-cache'), { cacheStaleMs: 25 })
      let one = await asset.get()
      let two = await asset.get()
      await delay(30)
      let three = await asset.get()

      server.log.should.have.length(2)
      two.should.equal(one)
      three.should.not.equal(one)
    })

    it('requests after cacheStaleMs', async ()=> {
      server.files.set('/refresh-cache', 'ok')

      let asset = new HttpAsset(url('/refresh-cache'), { cacheStaleMs: 5 })
      await asset.get()
      await delay(10)
      await asset.get()

      server.log.should.have.length(2)
    })

    it('reuses cache on failure', async ()=> {
      server.files.set('/quark', function ({req, res}) {
        if (server.log.length) {
          res.status = 404
        } else {
          res.status = 200
          res.body = 'hi'
        }
      })

      let asset = new HttpAsset(url('/quark'), { cacheStaleMs: 0 })
      ;(await asset.get()).should.equal('hi')
      ;(await asset.get()).should.equal('hi')

      server.log.should.have.length(2)
      server.log[0].res.status.should.equal(200)
      server.log[1].res.status.should.equal(404)
    })

    it('respects the etag', async ()=> {
      server.files.set('/check-etag', function ({req, res}) {
        if (req.headers['if-none-match'] === 'eeeeee') {
          res.status = 304
        } else {
          res.status = 200
          res.body = 'who 4 art'
          res.headers.etag = 'eeeeee'
        }
      })

      let asset = new HttpAsset(url('/check-etag'), { cacheStaleMs: 0 })
      await asset.get()
      await asset.get()

      server.log.should.have.length(2)
      let one = server.log[0].res
      one.body.should.equal('who 4 art');
      one.status.should.eql(200)

      let two = server.log[1].res
      Boolean(two.body).should.be.false
      two.status.should.eql(304)
    });

    it('respects the expires header', async ()=> {
      server.files.set('/check-expires', function ({req, res}) {
        if (req.headers['if-none-match'] === 'eeeeee') {
          res.status = 205
          res.body = 'high five!'
        } else {
          res.status = 200
          res.body = 'come back soon'
          res.headers.etag = 'eeeeee'
          res.headers.expires = (new Date).toUTCString()
        }
      })

      let asset = new HttpAsset(url('/check-expires'), { cacheStaleMs: 1000 * 6 * 5 })

      await asset.get()
      await asset.get()

      server.log.should.have.length(2)
      let one = server.log[0].res
      one.body.should.equal('come back soon')
      one.status.should.equal(200)

      let two = server.log[1].res
      two.body.should.equal('high five!')
      two.status.should.equal(205)
    });

  })
})
