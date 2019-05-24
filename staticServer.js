"use strict";
// nodejs 搭建静态服务器
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var http_1 = __importDefault(require("http"));
var path_1 = __importDefault(require("path"));
var mime_1 = __importDefault(require("mime"));
var zlib_1 = __importDefault(require("zlib"));
var crypto_1 = __importDefault(require("crypto"));
var PORT = 3001;
var GzipRE = /\bgzip\b/;
var DeflateRE = /\bdeflate\b/;
var MyServer = /** @class */ (function (_super) {
    __extends(MyServer, _super);
    function MyServer() {
        var _this = _super.call(this) || this;
        _this.stat = null;
        _this.readStream = null;
        _this.assetPath = "";
        _this._init();
        return _this;
    }
    MyServer.prototype._init = function () {
        var _this = this;
        // 监听 request 事件
        this.on('request', function (req, res) {
            try {
                _this.handleRequest(req, res);
                if (!_this.checkLastModified(req, res)) {
                    _this.sendFile(req, res);
                    return;
                }
                _this.handleEncoding(req, res);
                if (!_this.checkEtag(req, res)) {
                    _this.sendFile(req, res);
                    return;
                }
                _this.sendFile(req, res);
            }
            catch (e) {
                console.error(e);
                _this.handleNotFound(req, res);
            }
        });
        this.listen(PORT, function () {
            console.log("nodejs \u670D\u52A1\u5668\u6B63\u5728\u8FD0\u884C,\u7AEF\u53E3:" + PORT);
        });
        this.on('error', function (e) {
            console.log(e);
        });
    };
    // 根据请求寻找目标文件
    MyServer.prototype.handleRequest = function (req, res) {
        console.log(req.url);
        if (!req.url)
            throw new Error('找不到 url');
        this.stat = fs_1.default.statSync(path_1.default.join(__dirname, req.url));
        // 寻找静态资源
        this.assetPath = req.url === '/' ? path_1.default.join(__dirname, '/nodejs.html') : path_1.default.join(__dirname, req.url);
        this.readStream = fs_1.default.createReadStream(this.assetPath);
    };
    // 压缩相关
    MyServer.prototype.handleEncoding = function (req, res) {
        var acceptEncoding = req.headers["accept-encoding"];
        if (!acceptEncoding || !this.readStream)
            throw new Error('找不到 url');
        if (acceptEncoding.match(GzipRE)) {
            res.setHeader("Content-Encoding", "gzip");
            this.readStream = this.readStream.pipe(zlib_1.default.createGzip());
        }
        else if (acceptEncoding.match(DeflateRE)) {
            res.setHeader("Content-Encoding", "deflate");
            this.readStream = this.readStream.pipe(zlib_1.default.createDeflate());
        }
    };
    MyServer.prototype.sendFile = function (req, res) {
        if (!req.url)
            throw new Error('找不到 url');
        // __dirname 为当前执行文件所在的完整目录名（绝对路径）eg. "C:\Users\007\Desktop\static-server"
        // process.cwd 为当前执行 node 命令的文件目录名（绝对路径）eg. "C:\Users\007\Desktop\static-server\nodejs.js"
        // __filename 为当前执行文件的完整目录名 （绝对路径） eg. "C:\Users\007\Desktop\static-server\nodejs.js"
        if (mime_1.default.getType(this.assetPath)) {
            res.setHeader("content-type", mime_1.default.getType(this.assetPath) + ';charset=utf-8');
        }
        // 走到这步时 readStream 一定存在，不存在会直接走 handleNotFound
        this.readStream.pipe(res);
    };
    // 协商缓存（文件最后修改时间）
    MyServer.prototype.checkLastModified = function (req, res) {
        if (!this.stat)
            throw new Error('找不到文件');
        var lastModified = this.stat.ctime.toUTCString();
        var ifModifiedSince = req.headers['if-modified-since'];
        res.setHeader('last-modified', lastModified);
        if (lastModified === ifModifiedSince) {
            res.statusCode = 304;
            res.end();
            return false;
        }
        return true;
    };
    // 协商缓存（etag）
    MyServer.prototype.checkEtag = function (req, res) {
        if (!this.readStream)
            throw new Error('找不到文件');
        var md5 = crypto_1.default.createHash('md5');
        // 通过最后修改时间和文件大小计算出 etag
        var etag = md5.update(this.stat.ctime.toUTCString() + this.stat.size).digest('hex');
        var ifNoneMatch = req.headers['if-none-match'];
        res.setHeader('Etag', etag);
        if (ifNoneMatch === etag) {
            res.statusCode = 304;
            res.end();
            return false;
        }
        return true;
    };
    MyServer.prototype.handleNotFound = function (req, res) {
        res.statusCode = 404;
        res.end();
    };
    return MyServer;
}(http_1.default.Server));
new MyServer();
//# sourceMappingURL=staticServer.js.map