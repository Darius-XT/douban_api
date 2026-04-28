//引入框架
const express = require('express');

//配置文件
const config = require('./config/config');

//工具函数
const { getIPAdress, log } = require('./utils/utils');

//跨域处理
const cors = require('./middlewares/cors');

//引入路由
const router = require('./routes/index');

//创建应用
const app = express();

function sanitizeQuery(query = {}) {
    return Object.keys(query).reduce((result, key) => {
        const value = query[key];
        result[key] = /(token|key|secret|auth|session)/i.test(key) ? '***' : value;
        return result;
    }, {});
}

//跨域处理
app.use((req, res, next) => {
    const start = Date.now();
    const requestMeta = {
        method: req.method,
        url: req.originalUrl,
        query: sanitizeQuery(req.query),
        ip: req.ip,
        userAgent: req.headers['user-agent']
    };

    log.info(`→ ${req.method} ${req.originalUrl}`);
    log.debug(requestMeta);

    const _json = res.json.bind(res);
    res.json = function (body) {
        const ms = Date.now() - start;
        const status = body && body.status;
        const count = Array.isArray(body && body.data) ? body.data.length : '-';
        if (status === false) {
            log.warn(`← ${req.method} ${req.originalUrl} | 失败: ${body.msg} | ${ms}ms`);
            log.debug({
                request: requestMeta,
                response: body
            });
        } else {
            log.info(`← ${req.method} ${req.originalUrl} | ${count} 条数据 | ${ms}ms`);
        }
        return _json(body);
    };

    next();
});

app.use(cors);

//路由
app.use(router);

//处理404响应
app.use(function (req, res, next) {
    log.warn(`404 ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        status: false,
        msg: '接口不存在',
        data: null
    });
});

//错误处理
app.use(function (err, req, res, next) {
    const errorMeta = {
        method: req.method,
        url: req.originalUrl,
        query: sanitizeQuery(req.query),
        stack: err && err.stack ? err.stack : String(err)
    };
    log.error('兜底错误处理');
    log.error(errorMeta);
    res.status(500).json({
        status: false,
        msg: '服务器内部错误',
        data: null
    });
});

//监听端口
app.listen(config.port, () => {
    let ip = getIPAdress();
    log('服务成功启动');
    log(`访问地址：http://localhost:${config.port}`);
    log(`访问地址：http://${ip}:${config.port}`);
});