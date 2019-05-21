"use strict";
// nodejs 搭建静态服务器
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var http_1 = __importDefault(require("http"));
var path_1 = __importDefault(require("path"));
var mime_1 = __importDefault(require("mime"));
var zlib_1 = __importDefault(require("zlib"));
var PORT = 3001;
var GzipRE = /\bgzip\b/;
var DeflateRE = /\bdeflate\b/;
var server = http_1.default.createServer();
// 监听 request 事件
server.on('request', function (req, res) {
    // 对 ico 资源文件的处理
    console.log(req.url);
    try {
        var readStream = void 0;
        var assetPath = void 0;
        // 检查是否有该文件，没有会报错并被捕获
        var stat = fs_1.default.statSync(path_1.default.join(__dirname, req.url));
        // 缓存
        var ifModifiedSince = req.headers['if-modified-since'];
        if (ifModifiedSince) {
            var lastModified = stat.ctime.toUTCString();
            if (lastModified === ifModifiedSince) {
                res.statusCode = 304;
                res.end();
            }
            else {
                res.setHeader('last-modified', lastModified);
            }
        }
        // __dirname 为当前执行文件所在的完整目录名（绝对路径）eg. "C:\Users\007\Desktop\static-server"
        // process.cwd 为当前执行 node 命令的文件目录名（绝对路径）eg. "C:\Users\007\Desktop\static-server\nodejs.js"
        // __filename 为当前执行文件的完整目录名 （绝对路径） eg. "C:\Users\007\Desktop\static-server\nodejs.js"
        // 寻找静态资源
        assetPath = req.url === '/' ? path_1.default.join(__dirname, '/nodejs.html') : path_1.default.join(__dirname, req.url);
        readStream = fs_1.default.createReadStream(assetPath);
        res.setHeader("content-type", mime_1.default.getType(assetPath));
        // 压缩
        var acceptEncoding = req.headers["accept-encoding"];
        if (acceptEncoding.match(GzipRE)) {
            res.setHeader("Content-Encoding", "gzip");
            readStream.pipe(zlib_1.default.createGzip()).pipe(res);
        }
        else if (acceptEncoding.match(DeflateRE)) {
            res.setHeader("Content-Encoding", "deflate");
            readStream.pipe(zlib_1.default.createDeflate()).pipe(res);
        }
        else {
            readStream.pipe(res);
        }
    }
    catch (e) {
        res.statusCode = 404;
        res.end('not found');
    }
});
server.listen(PORT, function () {
    console.log('nodejs 服务器正在运行');
});
server.on('error', function (e) {
    console.log(e);
});
