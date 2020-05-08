import Gun from 'gun/gun.js';

import 'gun/sea.js';
import 'gun/lib/path.js';

/** @typedef { import('vendor/gun/types/chain').IGunChainReference } GunRef */

/** @typedef { import('vendor/gun/types/types').IGunCryptoKeyPair } KeyPair */
/** @typedef { import('vendor/gun/types/types').AckCallback }       Callback */

const SEA = Gun.SEA;

(() => {
    // extend SEA functions to base64 encode encrypted data
    // workaround for https://github.com/amark/gun/issues/783

    const _encrypt = SEA.encrypt;
    SEA.encrypt = function(...args) {
        return _encrypt.apply(this, args)
            .then(enc => btoa(JSON.stringify(enc)));
    };

    const _decrypt = SEA.decrypt;
    SEA.decrypt = function(data, ...args) {
        try     { data = JSON.parse(atob(data)); } catch(e) { /* continue */ }
        return _decrypt.apply(this, [data, ...args]);
    };
})();

/**
 * Returns path of this node as an array
 */
Gun.prototype.getPath = function() {
    const gun = this; let path = [];
    gun.back(at => { if (at.has) { path.unshift(at.get); } });

    return path;
};

/**
 * Get user's secret key to a given path
 * If key does not exist, generate a new one
 */
async function getTrustKey(user, pair, path) {

    const trust = user.get('trust').get(pair.pub).path(path);
    let sec = await trust.then();

    if (sec) {
        sec = await SEA.decrypt(sec, pair);

    } else {
        sec = SEA.random(32).toString('base64');
        trust.put(await SEA.encrypt(sec, pair));

    } return sec;
}

/**
 * Encrypt and put data in authenticated user
 * @override function of SEA User (see sea/create.js)
 *
 * @param { Object } data
 * @param { Callback } [callback]
 */
SEA.Gun.User.prototype.secret = async function(data, callback) {
    const gun  = this;       const user = gun.back(-1).user();
    const pair = user._.sea; const path = gun.getPath();

    const sec = await getTrustKey(user, pair, path);
    const enc = await SEA.encrypt(data, sec);

    return gun.put(enc, callback);
};

/**
 * Get and decrypt data from authenticated user
 * @param { String } prop - property to get
 */
SEA.Gun.User.prototype.getOwnSecret = async function(prop) {
    const gun  = this;       const user = gun.back(-1).user();
    const pair = user._.sea; const path = gun.getPath();

    path.push(prop);

    let sec = await user.get('trust').get(pair.pub).path(path).then();
    sec = await SEA.decrypt(sec, pair);

    const enc = await gun.get(prop).then();
    return SEA.decrypt(enc, sec);
};

/**
 * Grant read access to another user
 * @override function of SEA User (see sea/create.js)
 *
 * @param { GunRef } to
 * @param { Callback } [callback]
 */
SEA.Gun.User.prototype.grant = async function(to, callback) {
    const gun  = this;       const user = gun.back(-1).user();
    const pair = user._.sea; const path = gun.getPath();

    const dh  = await SEA.secret(await to.get('epub').then(), pair);

    const sec = await getTrustKey(user, pair, path);
    const enc = await SEA.encrypt(sec, dh);

    // if pub is not already in trust, first put an empty node
    // workaround for https://github.com/amark/gun/issues/844

    const trust = user.get('trust').get(await to.get('pub').then());
    if (!await trust.then()) { await trust.path(path).put({}).then(); }

    return trust.path(path).put(enc, callback);
};

/**
 * Get and decrypt data from unauthenticated user
 *
 * @param { String } prop - property to get
 * @param { KeyPair } pair - trusted keys
 */
Gun.prototype.getSecret = async function(prop, pair) {
    const gun  = this; const path = gun.getPath();
    const user = path.length > 0 ? gun.back(path.length) : gun;

    path.push(prop);

    let sec = await user.get('trust').get(pair.pub).path(path).then();
    if (!sec) { console.error('error getting secret key'); return; }

    const enc = await gun.get(prop).then();
    if (!enc) { console.error(`error getting '${ prop }'`); return; }

    const mix = await SEA.secret(await user.get('epub').then(), pair);

    sec = await SEA.decrypt(sec, mix);
    return SEA.decrypt(enc, sec);
};

export default Gun;
