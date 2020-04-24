import Gun from './gun-api.js';

import express from 'express'; import https from 'https';
import path    from 'path';    import fs    from 'fs';

import minimist from 'minimist';
const argv = minimist(process.argv.slice(2));

import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

//TODO: replace these with config file
const host = '0.0.0.0';
const port = 8081;

console.info('\n', '\x1b[33m',
             `Starting relay peer on port ${ port } with /gun...`, '\x1b[0m\n');

const app = express();
const dataPath = path.join(__dirname, 'data');

app.use(Gun.serve);
app.use(express.static(__dirname));

let server;
if (argv.mode === 'production') {

    server = https.createServer({
        key : fs.readFileSync(process.env.SSL_KEY),
        cert: fs.readFileSync(process.env.SSL_CERT)

    }, app).listen(port);

} else { server = app.listen(port, host); }

const gun = new Gun({ file: dataPath, web: server, axe: false });

if (argv.mode === 'development') {
    Gun.SEA.throw = true;

    // log peer connections

    const listPeers = (peer, color) => Object.keys(gun._.opt.peers).reduce(
        (acc, cur, idx, src) => acc +

            `${ (cur === peer.id ? `${ color }${ cur }\x1b[0m` : cur) }` +
            `${ idx < src.length-1 ? ', ' : '' }`, '');

    const getLabel = peer => `\x1b[8m${ peer.id }\x1b[0mduration`;

    gun.on('hi',  peer => console.log('\n 🉑', listPeers(peer, '\x1b[44m')) ||
                          console.time   (getLabel(peer)));

    gun.on('bye', peer => console.log('\n ⭕', listPeers(peer, '\x1b[41m')) &&
                          console.timeEnd(getLabel(peer)));
}
