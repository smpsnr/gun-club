import Gun from 'gun-api';

// enable RAD storage adapter backed by IndexedDB
import 'gun/lib/radix'; import 'gun/lib/radisk';
import 'gun/lib/store'; import 'gun/lib/rindexed';

import 'gun/lib/load';

/** @typedef { import('./types/static').IGunStatic }         Gun */
/** @typedef { import('./types/chain') .IGunChainReference } GunRef */

const SEA = Gun.SEA;
if (process.env.MODE === 'development') { SEA.throw = true; }

const port = process.env.PORT || 8765;
const peer = `${ location.protocol }//${ location.hostname }:${ port }/gun`;

// warn if enabling WebRTC for multiple peers
let enabledRTC = false;

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
    });

    return gun;
};

Gun.prototype.value = function(cb, opt) {

    return this.once(/** @this { GunRef } */ function(val, field) {
        // @ts-ignore
        if (val) { val = Gun.obj.copy(val); delete val._; }
        cb.call(this, val, field);

    }, opt);
};

Gun.prototype.valueAt = function(node, at, cb, opt) {
    let pathNode = node.path(at, '/');

    if (pathNode) { pathNode.value(cb, opt);               }
    else          { throw new Error(`No such path ${at}`); }
};

Gun.prototype.putAt = function(node, at, obj, cb, opt) {
    let pathNode = node.path(at, '/');

    if (pathNode) {
        node._.paths = node._.paths || [];
        pathNode.put(obj, cb, opt); node._.paths.push(at);

    } else { throw new Error(`No such path ${at}`); }
};

Gun.prototype.setAt = function(node, at, obj, cb) {
    let pathNode = node.path(at, '/');

    if (pathNode) { pathNode.set(obj, cb);                 }
    else          { throw new Error(`No such path ${at}`); }
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
        else { console.error('multiple WebRTC peers - expect problems'); }
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
