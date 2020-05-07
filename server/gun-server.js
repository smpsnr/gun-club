import Gun from './gun-api.js';

import express from 'express'; import https from 'https';
import path    from 'path';    import fs    from 'fs';

import minimist from 'minimist';
const argv = minimist(process.argv.slice(2));

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 8765;

const axe       = process.env.AXE       || true;
const multicast = process.env.MULTICAST || true;

console.info('\n', '\x1b[33m',
             `Starting relay peer on port ${ port } with /gun...`, '\x1b[0m\n');

const app = express();

app.use(Gun.serve);
app.use(express.static(__dirname));

let server;
if (argv.mode === 'production') {

    server = https.createServer({
        key : fs.readFileSync(process.env.SSL_KEY),
        cert: fs.readFileSync(process.env.SSL_CERT)

    }, app).listen(port);

} else { server = app.listen(port, host); }

const hasValidToken = msg => msg.headers && msg.headers.token
    && msg.headers.token === 'thisIsTheTokenForReals';

/**
 * Check if msg represents a channel content put
 * @returns public key of channel, or false
 */
function getContentChannel(context, msg) {
    if (!msg || !msg.put) { return false; }
    if ( msg['@'])        { return false; }

    for (const [soul, data] of Object.entries(msg.put)) {

        if (soul.startsWith('~')) { continue; }
        if (soul === 'content')   { return Object.keys(data).find(k => k != '_'); }

        const content = context.next['content'];
        if (!content) { return false; }

        for (const [key, channel] of Object.entries(content.put)) {
            if (channel['#'] && channel['#'] === soul) { return key; }
        }

    } return false;
}

Gun.on('opt', function(context) {
    if (context.once) { return; } this.to.next(context);

    context.on('in', function(msg) {

        const channel = getContentChannel(context, msg);
        if (channel) {

            if (hasValidToken(msg)) { console.log(context, msg);this.to.next(msg); }
            else { console.warn('blocking unauthorized put'); }

        } else { this.to.next(msg); }
    });
});

const gun = new Gun({
    web: server, axe: axe,
    multicast: multicast ? { port: port } : false
});

if (argv.mode === 'development') {
    Gun.SEA.throw = true;

    // log peer connections

    const listPeers = (peer, color) => Object.keys(gun._.opt.peers).reduce(
        (acc, cur, idx, src) => acc +

            `${ (cur === peer.id ? `${ color }${ cur }\x1b[0m` : cur) }` +
            `${ idx < src.length-1 ? ', ' : '' }`, '');

    gun.on('hi',  peer => console.log('\n 🉑', listPeers(peer, '\x1b[44m')));
    gun.on('bye', peer => console.log('\n ⭕', listPeers(peer, '\x1b[41m')));
}
