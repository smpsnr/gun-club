import Gun             from './gun-api.js';
import * as GunChannel from './gun-channel.js';

import 'gun/nts.js';      import 'gun/lib/store.js';
import 'gun/lib/wire.js'; import 'gun/axe.js';

import 'gun/lib/evict.js';

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

// configure server

const app = express(); let server;

//app.use(Gun.serve);
//app.use(express.static(__dirname));

if (argv.mode === 'production') {

    server = https.createServer({
        key : fs.readFileSync(process.env.SSL_KEY),
        cert: fs.readFileSync(process.env.SSL_CERT)

    }, app).listen(port);

} else {
    Gun.SEA.throw = true;
    server = app.listen(port, host);

} Gun.on('opt', GunChannel.handleIncoming);

// start server

console.info('\n', '\x1b[33m',
             `Starting relay peer on port ${ port } with /gun...`, '\x1b[0m\n');

const gun = new Gun({
    web: server, axe: axe,
    multicast: multicast ? { port: port } : false
});

if (argv.mode === 'development') {
    // log peer connections

    const listPeers = (peer, color) => Object.keys(gun._.opt.peers).reduce(
        (acc, cur, idx, src) => acc +

            `${ (cur === peer.id ? `${ color }${ cur }\x1b[0m` : cur) }` +
            `${ idx < src.length-1 ? ', ' : '' }`, '');

    gun.on('hi',  peer => console.log('\n 🉑', listPeers(peer, '\x1b[44m')));
    gun.on('bye', peer => console.log('\n ⭕', listPeers(peer, '\x1b[41m')));
}
