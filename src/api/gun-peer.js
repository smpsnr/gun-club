import Gun from 'gun-api';

// enable RAD storage adapter backed by IndexedDB
import 'gun/lib/radix'; import 'gun/lib/radisk';
import 'gun/lib/store'; import 'gun/lib/rindexed';

import 'gun/lib/load';

/** @typedef { import('vendor/gun/types/static').IGunStatic }         Gun */
/** @typedef { import('vendor/gun/types/chain') .IGunChainReference } GunRef */

const SEA = Gun.SEA;
if (process.env.MODE === 'development') { SEA.throw = true; }

const port = process.env.PORT || 8765;
const peer = `${ location.protocol }//${ location.hostname }:${ port }/gun`;

// warn if enabling WebRTC for multiple peers
let enabledRTC = false;

function checkContentPut(context, msg) {
    if (!msg.put)                 { return false; }
    if (!context.next['content']) { return false; }

    for (const soul of Object.keys(msg.put)) {
        if (soul === 'content') { return true; }

        for (const channel of Object.values(context.next['content'].next)) {
            if (channel.link === soul) { return true; }

            for (const node of Object.values(channel.next)) {
                if (node.link === soul) { return true; }
            }
        }

    } return false;
}

Gun.on('opt', /** @this { any } */ function(context) {

    if (context.once) { return; } this.to.next(context);
    context.on('out', /** @this { any } */ function(msg) {

        if (checkContentPut(context, msg)) {

            console.debug('putting to content');
            msg.headers = { token: 'thisIsTheTokenForReals' };

        } this.to.next(msg);
    });
});

Gun.prototype.valMapEnd = function(each, ended) {
    const gun = this; const props = [];
    const n = () => {};

    let count = 0;
    each = each || n; ended = ended || n;

    gun.once(function(list) {
        const args = Array.prototype.slice.call(arguments);

        // @ts-ignore
        Gun.node.is(list, (_, prop) => { count += 1; props.push(prop); });

        props.forEach(prop => {
            gun.get(prop).once(/** @this { GunRef } */ function() {
                count -= 1; each.apply(this, arguments);
                if (!count) { ended.apply(this, args); }
            });
        });

    }); return gun;
};

Gun.prototype.value = function(cb, opt) {

    return this.once(/** @this { GunRef } */ function(val, field) {
        // @ts-ignore
        if (val) { val = Gun.obj.copy(val); delete val._; }
        cb.call(this, val, field);

    }, opt);
};

Gun.prototype.valueAt = function(at, cb, opt) {
    const pathNode = this.path(at);

    if (pathNode) { pathNode.value(cb, opt);               }
    else          { throw new Error(`No such path ${at}`); }
};

/**
 * Get child paths of path (not recursive)
 * @param { Array<String> } at - path
 */
Gun.prototype.getPathsAt = async function(at) {
    const data = await new Promise(resolve =>
        this.valueAt(at, v => resolve(v)));

    if (data instanceof Object) {
        return Object.keys(data).map(key => [...at, key]);

    } return [at];
};

/**
 * Find all child paths of path (recursive)
 *
 * @param { Array<String> } at - path
 * @returns { Promise<Array<Array<String>>> }
 */
Gun.prototype.loadPathsAt = async function(at) {
    const gun = this; await gun;
    if (at && gun && !gun._.link) { return [at]; }

    const paths = [];
    const pathsAt = await gun.getPathsAt(at);

    for (const path of pathsAt) {

        const next = gun.get(path[path.length-1]);
        Array.prototype.push.apply(paths, await next.loadPathsAt(path));

    } return paths;
};

/**
 * Returns a new Gun instance
 * @param {{ name: String, useRTC: boolean }} _
 */
export const GunPeer = ({ name = '', useRTC = false }) => {
    console.info(`starting gun peer "${ name }"`);

    if (useRTC) { // enable automatic peer signaling and discovery
        console.info('enabling WebRTC'); require('gun/lib/webrtc');

        if (!enabledRTC) { enabledRTC = true; }
        else { console.warn('multiple WebRTC peers - expect problems'); }
    }

    return new (/** @type {Gun} */(/** @type {any} */ (Gun)))({
        peers: [ peer ], file: name,
        localStorage: false, indexedDB: true
    });
};

export { Gun, SEA };

// example usage:

/* const gun = GunPeer('user');

gun.get('~@civiclink').once(async data => {

    const pub = Object.keys(data).find(key => key.startsWith('~')).slice(1);
    const civiclink = gun.user(pub);

    console.log(await civiclink.get('name').then());
}); */
