import Gun                      from 'gun-api';
import { buildOutgoingHandler } from 'gun-api/gun-channel';

// enable RAD storage adapter backed by IndexedDB
import 'gun/lib/radix'; import 'gun/lib/radisk';
import 'gun/lib/store'; import 'gun/lib/rindexed';

//! vuex dependency is circular - see below
import store from '../store/index';

const SEA = Gun.SEA;
if (process.env.MODE === 'development') { SEA.throw = true; }

let enabledRTC = false; // warn if enabling WebRTC for multiple peers
const useAxe = JSON.parse(process.env.AXE) || false;

// configure channel request handler to load tokens from vuex
// wrap getter function (store uses gun-adapter which depends on this module)

const handleOutgoing = buildOutgoingHandler(
    channel => store.getters.getChannelByKey(channel));

Gun.on('opt', handleOutgoing);

/**
 * @param each - called for each item with (val, key)
 * @ended ended - called once on map completion with (vals[], key)
 */
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
            gun.get(prop).once(/**@this {import('types').GunRef}*/ function() {
                count -= 1; each.apply(this, arguments);
                if (!count) { ended.apply(this, args); }
            });
        });

    }); return gun;
};

Gun.prototype.value = function(cb, opt) {

    return this.once(/**@this {import('types').GunRef}*/ function(val, field) {
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
 * Route the output of this Gun instance to the input of another instance
 * @param { import('types').GunRef } otherGun
 */
Gun.prototype.connectInstance = function(otherGun) {
    this.on('out', function(msg) {

        otherGun.on('in', msg);
        this.to.next(msg);
    });
};

/**
 * Add peer by url
 * @param { String } url
 */
Gun.prototype.addPeer = function(url) {
    this.opt(url);
};

/**
 * Returns a new Gun instance
 */
export const GunPeer = (
    { useStorage = true, peers = [], useRTC = false } = {}) => {

    console.info(`starting gun peer "${ name }"`);
    if (useRTC) { // enable automatic peer signaling and discovery

        if (useAxe) {
            console.info('enabling AXE');    require('gun/axe');
        }   console.info('enabling WebRTC'); require('gun/lib/webrtc');

        if (!enabledRTC) { enabledRTC = true; }
        else { console.warn('multiple WebRTC peers - expect problems'); }
    }

    return new (/**@type {import('types').Gun}*/(/**@type {any}*/ (Gun)))({
        peers: peers, file: '', retry: Infinity,
        localStorage: false, indexedDB: true, radisk: useStorage
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
