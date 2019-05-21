// nodejs 搭建静态服务器

import fs from 'fs';
import http from 'http';
import path from 'path';
import mime from 'mime';
import zlib from 'zlib';


const PORT: number = 3001
const GzipRE: RegExp = /\bgzip\b/
const DeflateRE: RegExp = /\bdeflate\b/

const server = http.createServer()

// 监听 request 事件
server.on('request', (req, res) => {
    // 对 ico 资源文件的处理
    console.log(req.url)

    try {
        let readStream: fs.ReadStream;
        let assetPath: string;
        // 检查是否有该文件，没有会报错并被捕获
        let stat: fs.Stats = fs.statSync(path.join(__dirname, req.url))


        // 缓存
        let ifModifiedSince: string | null = req.headers['if-modified-since']
        if (ifModifiedSince) {
            let lastModified: string = stat.ctime.toUTCString()
            if (lastModified === ifModifiedSince) {
                res.statusCode = 304
                res.end()
            } else {
                res.setHeader('last-modified', lastModified)
            }
        }


        // __dirname 为当前执行文件所在的完整目录名（绝对路径）eg. "C:\Users\007\Desktop\static-server"
        // process.cwd 为当前执行 node 命令的文件目录名（绝对路径）eg. "C:\Users\007\Desktop\static-server\nodejs.js"
        // __filename 为当前执行文件的完整目录名 （绝对路径） eg. "C:\Users\007\Desktop\static-server\nodejs.js"

        // 寻找静态资源
        assetPath = req.url === '/' ? path.join(__dirname, '/nodejs.html') : path.join(__dirname, req.url)
        readStream = fs.createReadStream(assetPath)
        res.setHeader("content-type", mime.getType(assetPath))


        // 压缩
        let acceptEncoding: string = req.headers["accept-encoding"]
        if (acceptEncoding.match(GzipRE)) {
            res.setHeader("Content-Encoding", "gzip");
            readStream.pipe(zlib.createGzip()).pipe(res)
        } else if (acceptEncoding.match(DeflateRE)) {
            res.setHeader("Content-Encoding", "deflate");
            readStream.pipe(zlib.createDeflate()).pipe(res)
        } else {
            readStream.pipe(res)
        }

    } catch (e) {
        res.statusCode = 404
        res.end('not found')
    }

})

server.listen(PORT, () => {
    console.log('nodejs 服务器正在运行')
})
server.on('error', e => {
    console.log(e)
})
