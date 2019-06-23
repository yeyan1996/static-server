// nodejs 搭建静态服务器

import fs from 'fs';
import http from 'http';
import path from 'path';
import mime from 'mime';
import zlib from 'zlib';
import crypto from 'crypto'
import stream from 'stream'

const PORT: number = 3001
const GZIP_RE: RegExp = /\bgzip\b/
const DEFLATE_RE: RegExp = /\bdeflate\b/


class MyServer extends http.Server {

    private stat: fs.Stats | null;
    private readStream: stream.Stream | null
    private assetPath: string

    constructor() {
        super()
        this.stat = null
        this.readStream = null
        this.assetPath = ""
        this._init()
    }

    private _init() {
        // 监听 request 事件
        this.on('request', (req, res) => {
            try {
                this.handleRequest(req, res)
                if (!this.checkLastModified(req, res))return

                this.handleEncoding(req, res)

                if (!this.checkEtag(req, res)) return
                this.sendFile(req, res)
            } catch (e) {
                console.error(e)
                this.handleNotFound(req, res)
            }
        })
        this.listen(PORT, () => {
            console.log(`nodejs 服务器正在运行,端口:${PORT}`)
        })
        this.on('error', e => {
            console.log(e)
        })
    }

    // 根据请求寻找目标文件
    handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
        console.log(req.url)
        if (!req.url) throw new Error('找不到 url')
        this.stat = fs.statSync(path.join(__dirname, req.url))
        // 寻找静态资源
        this.assetPath = req.url === '/' ? path.join(__dirname, '/nodejs.html') : path.join(__dirname, req.url)
        this.readStream = fs.createReadStream(this.assetPath)
    }

    // 压缩相关
    handleEncoding(req: http.IncomingMessage, res: http.ServerResponse) {
        let acceptEncoding: string | undefined = req.headers["accept-encoding"] as string | undefined
        if (!acceptEncoding || !this.readStream) throw new Error('找不到 url')

        if (acceptEncoding.match(GZIP_RE)) {
            res.setHeader("Content-Encoding", "gzip");
            this.readStream = this.readStream.pipe(zlib.createGzip())
        } else if (acceptEncoding.match(DEFLATE_RE)) {
            res.setHeader("Content-Encoding", "deflate");
            this.readStream = this.readStream.pipe(zlib.createDeflate())
        }
    }

    sendFile(req: http.IncomingMessage, res: http.ServerResponse): void {
        if (!req.url) throw new Error('找不到 url')
        // __dirname 为当前执行文件所在的完整目录名（绝对路径）eg. "C:\Users\007\Desktop\static-server"
        // process.cwd 为当前执行 node 命令的文件目录名（绝对路径）eg. "C:\Users\007\Desktop\static-server\nodejs.js"
        // __filename 为当前执行文件的完整目录名 （绝对路径） eg. "C:\Users\007\Desktop\static-server\nodejs.js"

        if (mime.getType(this.assetPath)) {
            res.setHeader("content-type", mime.getType(this.assetPath)! + ';charset=utf-8')
        }
        // 走到这步时 readStream 一定存在，不存在会直接走 handleNotFound
        this.readStream!.pipe(res)
    }

    // 协商缓存（文件最后修改时间）
    checkLastModified(req: http.IncomingMessage, res: http.ServerResponse): boolean {
        if (!this.stat) throw new Error('找不到文件')
        let lastModified: string = this.stat.ctime.toUTCString()
        let ifModifiedSince: string | undefined = req.headers['if-modified-since']
        res.setHeader('last-modified', lastModified)
        if (lastModified === ifModifiedSince) {
            res.statusCode = 304
            res.end()
            return false
        }
        return true
    }

    // 协商缓存（etag）
    checkEtag(req: http.IncomingMessage, res: http.ServerResponse): boolean {
        if (!this.readStream) throw new Error('找不到文件')
        let md5: crypto.Hash = crypto.createHash('md5')
        // 通过最后修改时间和文件大小计算出 etag
        let etag: string = md5.update(this.stat!.ctime.toUTCString() + this.stat!.size).digest('hex');
        let ifNoneMatch: string | undefined = req.headers['if-none-match']
        res.setHeader('Etag', etag)
        if (ifNoneMatch === etag) {
            res.statusCode = 304
            res.end()
            return false
        }
        return true
    }

    handleNotFound(req: http.IncomingMessage, res: http.ServerResponse): void {
        res.statusCode = 404
        res.end()
    }
}

new MyServer()

