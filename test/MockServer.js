let debug = require('debug')('http-asset:MockServer')
let {createServer} = require('http')
let {parse} = require('url')
let checksum = require('checksum')

export default class MockServer {
  constructor() {
    this.files = new Map()
    this.log = []

    this.httpServer = createServer((req, res) => {
      this.handle(req, res)
    })
  }

  reset() {
    this.files.clear()
    this.log.splice(0)
  }

  listen(port) {
    return new Promise((resolve, reject)=> {
      this.httpServer.listen(port, (err)=> {
        debug('listening on %s', port)
        return err ? reject(err) : resolve()
      })
    })
  }

  close() {
    return new Promise((resolve, reject)=> {
      this.httpServer.close((err)=> {
        debug('closed')
        return err ? reject(err) : resolve()
      })
    })
  }

  handle(req, res) {
    let {url, method, headers} = req
    let {path, host} = parse(url)

    let event = {
      req: {url, method, headers, path, host},
      res: { headers: {}, body: null, status: 404 }
    }

    let file = this.files.get(path)
    if (typeof file === 'function') file(event)
    else if (file) this.handleFile(event, file)
    else {
      debug('unknown path %s, options are %j', path, ...this.files.keys())
    }

    // write the resovled vals to the resp
    res.writeHead(
      event.res.status,
      event.res.headers
    )

    res.end(event.res.body, 'utf8')

    debug('request: %s %s > %j', method, path, headers)
    debug('response: %s %j', event.res.status, event.res.headers)
    this.log.push(event)
  }

  handleFile(event, body) {
    let etag = checksum(body)
    let headers = event.res.headers;
    headers.ETag = etag
    headers['Content-Length'] = body.length

    if (headers['if-none-match'] === etag) {
      event.res.status = 304
    } else {
      event.res.status = 200
      event.res.body = body
    }
  }
}