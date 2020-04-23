//* suppress log spam from modules
this       .log = console.log;     console.log = () => {}; this.relog = () => {
    console.log = this   .log; delete this.log;     delete this.relog; };
//* ...........................................................................

const Gun = require('gun'); Gun.SEA.throw = true;
//TODO                      disable in production

const express = require('express'); //* end log supression
const path    = require('path');    this.relog();

const stdout = process.stdout;

//TODO: replace these with config file
const host = '0.0.0.0'; const port = 8081;

console.info('\x1b[33m',
             `Starting relay peer on port ${ port } with /gun`, '\x1b[0m\n');

const app = express();
const dataPath = path.join(__dirname, 'data');

app.use(Gun.serve);
app.use(express.static(__dirname));

const server = app.listen(port, host);
const gun = new Gun({ file: dataPath, web: server, axe: false });

// log peer connections

const listPeers = (peer, color) => Object.keys(gun._.opt.peers).reduce(
    (acc, cur, idx, src) => acc +

        `${ (cur === peer.id ? `${ color }${ cur }\x1b[0m` : cur) }` +
        `${ idx < src.length-1 ? ', ' : '' }`, '');

const getLabel = peer => `\x1b[8m${ peer.id }\x1b[0mduration`;

gun.on('hi',  peer => console.log ('\n 🉑',   listPeers(peer, '\x1b[44m')) ||
                      console.time   (getLabel(peer)));

gun.on('bye', peer => stdout.write('\n ⭕ ' + listPeers(peer, '\x1b[41m')) &&
                      console.timeEnd(getLabel(peer)));
