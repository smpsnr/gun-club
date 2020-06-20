import Gun from 'gun/gun.js';
export { default as Gun } from 'gun/gun.js';
import 'gun/nts.js';
import 'gun/sea.js';
import 'gun/lib/path.js';

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
 * @param { import('types').AckCallback } [callback]
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
 * @param { import('types').GunRef } to
 * @param { import('types').AckCallback } [callback]
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
 * @param { import('types').KeyPair } pair - trusted keys
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

const SEA$1 = Gun.SEA;

/**
 * Get secret channel content key
 *
 * @param { import('types').GunRef } channel
 * @param { String } pub
 */
async function getContentKey(channel, pub) {
    const sec = await channel.get('trust').get(pub).get('content').then();
    if (!sec) { throw new Error('error getting content key'); } return sec;
}

/**
 * Write encrypted data to channel content node
 *
 * @param { import('types').GunRef } channel @param { string } pub - of channel
 * @param { Array<String>          } path    @param { Object } data
 *
 * @param { import('types').KeyPair     } pair - of principal
 * @param { import('types').AckCallback } [callback]
 */
const putChannelSecret = async function(channel, pub, path, data, pair, callback) {
    // get channel content meta key
    const sec = await getContentKey(channel, pair.pub);

    const mix = await SEA$1.secret(await channel.get('epub').then(), pair);
    const enc = await SEA$1.encrypt(data, await SEA$1.decrypt(sec, mix));

    // put encrypted data from channel content node

    const parentPath = path.slice(0, path.length-1);
    const dataKey    = path[path.length-1];

    let content = channel.back(-1).get('content').get(pub);
    if (parentPath.length) {

        content = content.path(parentPath); // handle path extensions
        if (await content.then()) { await content.put({}).then(); }

    } return content.get(dataKey).put(enc, callback);
};

/**
 * Get and decrypt data from channel content node

 * @param { import('types').GunRef } channel @param { String } pub - of channel
 *
 * @param { Array<String>           } path
 * @param { import('types').KeyPair } pair - of principal
 */
const getChannelSecret = async function(channel, pub, path, pair) {
    // get channel content meta key
    const sec = await getContentKey(channel, pair.pub);

    // get encrypted data from channel content node

    const enc = await channel.back(-1).get('content').get(pub).path(path).then();
    if (!enc) { console.error(`error getting '${ path }'`); return; }

    const mix = await SEA$1.secret(await channel.get('epub').then(), pair);
    return SEA$1.decrypt(enc, await SEA$1.decrypt(sec, mix));
};

/**
 * Check that token in msg was signed by channel pub
 * @returns true if token is valid
 */
async function validatePut(msg, pub) {
    if (!(msg && msg.headers && msg.headers.token)) { return false; }

    try      { return await SEA$1.verify(msg.headers.token, pub); }
    catch(e) { return false; }
}

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

        if (!content)     { return false; }
        if (!content.put) { continue; }

        for (const [key, channel] of Object.entries(content.put)) {
            if (channel['#'] && channel['#'] === soul) { return key; }
        }

    } return false;
}

/**
 * Validate incoming put requests
 * @example Gun.on('opt', context => handleChannelRequests(context))
 */
function handleIncoming(context) {

    if (context.once) { return; } this.to.next(context);
    context.on('in', /**@this{any}*/ async function(msg) {

        const channel = getContentChannel(context, msg);
        if (channel) { // validate channel content put

            if (await validatePut(msg, channel)) { this.to.next(msg); }
            else         { console.warn('blocking unauthorized put'); }

        } else { this.to.next(msg); }
    });
}

/**
 * Construct outgoing request handler with provided channel lookup function
 * @param { function(String):Object } getChannelByKey
 */
function buildOutgoingHandler(getChannelByKey) {
    /**
     * Validate & decorate outgoing put requests
     * ? should each peer validate requests from other peers? do they already?
     */
    return /**@this{any}*/ function(context) {

        if (context.once) { return; } this.to.next(context);
        context.on('out', /**@this{any}*/ async function(msg) {

            const channel = getContentChannel(context, msg);
            if (channel) {

                const token = getChannelByKey(channel).token;
                msg.headers = { token };

                if (process.env.MODE === 'production') {
                    // only transmit valid put requests
                    if (await validatePut(msg, channel)) { this.to.next(msg); }
                    else         { console.warn('blocking unauthorized put'); }

                } else { // let the master node handle it
                    if (!token) { console.warn('unauthorized put'); }
                    this.to.next(msg);
                }

            } else { this.to.next(msg); }
        });
    };
}

var gunChannel = /*#__PURE__*/Object.freeze({
    __proto__: null,
    putChannelSecret: putChannelSecret,
    getChannelSecret: getChannelSecret,
    validatePut: validatePut,
    getContentChannel: getContentChannel,
    handleIncoming: handleIncoming,
    buildOutgoingHandler: buildOutgoingHandler
});

export { gunChannel as GunChannel };
