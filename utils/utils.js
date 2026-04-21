const clc = require("cli-color");
const moment = require('moment');

exports.getIPAdress = function () {
    let interfaces = require('os').networkInterfaces();
    for (let devName in interfaces) {
        var iface = interfaces[devName];
        for (let i = 0; i < iface.length; i++) {
            let alias = iface[i];
            if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
                return alias.address;
            }
        }
    }
}

const LEVELS = {
    INFO:  { color: clc.xterm(202), label: 'INFO ' },
    DEBUG: { color: clc.xterm(245), label: 'DEBUG' },
    WARN:  { color: clc.xterm(214), label: 'WARN ' },
    ERROR: { color: clc.xterm(196), label: 'ERROR' },
};

function log(level, ...messages) {
    if (typeof level !== 'string' || !LEVELS[level]) {
        // 兼容旧的 log('message') 调用
        messages = [level, ...messages];
        level = 'INFO';
    }
    const { color, label } = LEVELS[level];
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    messages.forEach((item) => {
        const text = typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item);
        console.log(`  ${clc.xterm(240)(now)} ${color(`[${label}]`)} ${clc.white(text)}`);
    });
}

log.info  = (...args) => log('INFO',  ...args);
log.debug = (...args) => log('DEBUG', ...args);
log.warn  = (...args) => log('WARN',  ...args);
log.error = (...args) => log('ERROR', ...args);

exports.log = log;

exports.toNum = function (num, _default) {
    _default = _default || num;
    if (!num) {
        return _default;
    }
    return isNaN(Number(num)) ? _default : num;
}

exports.trims = function (str) {
    return str ? str.replace(/[\\n\s]+/img, '') : str;
}
