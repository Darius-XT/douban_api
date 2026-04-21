const puppeteer = require('puppeteer-core');
const cheerio = require('cheerio');
const { log } = require('./utils');

module.exports = async function (url) {
    log.info(`开始加载页面: ${url}`);
    const t0 = Date.now();

    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-blink-features=AutomationControlled',
        ],
        headless: true,
    });

    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    });

    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // 记录页面 JS 错误
    page.on('pageerror', err => log.warn(`页面 JS 错误: ${err.message}`));

    // 记录被拦截的关键请求（418 反爬）
    page.on('requestfailed', req => {
        const failure = req.failure()?.errorText || '';
        log.warn(`请求失败 [${req.resourceType()}] ${req.url().substring(0, 100)} — ${failure}`);
    });

    page.on('response', async resp => {
        if (resp.status() === 418) {
            log.error(`豆瓣返回 418（反爬拦截）: ${resp.url().substring(0, 100)}`);
        }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    log.debug(`页面初始加载完成，耗时 ${Date.now() - t0}ms，等待结果渲染...`);

    // 等待搜索结果渲染，最多25秒
    const found = await page.waitForSelector('#root .item-root', { timeout: 25000 })
        .then(() => true)
        .catch(() => false);

    if (!found) {
        log.warn(`等待 .item-root 超时（耗时 ${Date.now() - t0}ms），抓取页面状态诊断...`);
        const rootText = await page.$eval('#root', el => el.innerText).catch(() => '(#root 不存在)');
        log.debug(`#root 内容: ${rootText.substring(0, 200)}`);
        const failedJS = await page.evaluate(() =>
            window.__failedScripts ? window.__failedScripts.join(', ') : '(无记录)'
        ).catch(() => '(无法获取)');
        log.debug(`失败脚本: ${failedJS}`);
    } else {
        log.debug(`结果渲染完成，耗时 ${Date.now() - t0}ms`);
    }

    const content = await page.content();
    await browser.close();

    const $ = cheerio.load(content, { decodeEntities: false });
    const count = $('#root .item-root').length;
    log.info(`页面解析完成，找到 ${count} 条结果，总耗时 ${Date.now() - t0}ms`);

    return $;
}
