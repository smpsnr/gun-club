import Gun from './gun-api.js';
const SEA = Gun.SEA;

/** @typedef { import('vendor/gun/types/chain').IGunChainReference } GunRef */

/** @typedef { import('vendor/gun/types/types').IGunCryptoKeyPair } KeyPair */
/** @typedef { import('vendor/gun/types/types').AckCallback }       Callback */

/**
 * Get secret channel content key
 *
 * @param { GunRef } channel
 * @param { String } pub
 */
async function getContentKey(channel, pub) {
    const sec = await channel.get('trust').get(pub).get('content').then();
    if (!sec) { throw new Error('error getting content key'); } return sec;
}

/**
 * Write encrypted data to channel content node
 *
 * @param { GunRef }        channel               @param { string }   pub - public key of channel
 * @param { Array<String> } path                  @param { Object }   data
 * @param { KeyPair }       pair - principal keys @param { Callback } [callback]
 */
export const putChannelSecret = async function(channel, pub, path, data, pair, callback) {
    // get channel content meta key
    const sec = await getContentKey(channel, pair.pub);

    const mix = await SEA.secret(await channel.get('epub').then(), pair);
    const enc = await SEA.encrypt(data, await SEA.decrypt(sec, mix));

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
 *
 * @param { GunRef }        channel @param { String }  pub  - public key of channel
 * @param { Array<String> } path    @param { KeyPair } pair - principal keys
 */
export const getChannelSecret = async function(channel, pub, path, pair) {
    // get channel content meta key
    const sec = await getContentKey(channel, pair.pub);

    // get encrypted data from channel content node

    const enc = await channel.back(-1).get('content').get(pub).path(path).then();
    if (!enc) { console.error(`error getting '${ path }'`); return; }

    const mix = await SEA.secret(await channel.get('epub').then(), pair);
    return SEA.decrypt(enc, await SEA.decrypt(sec, mix));
};

/**
 * Check that token in msg was signed by channel pub
 * @returns true if token is valid
 */
export async function validatePut(msg, pub) {
    if (!(msg && msg.headers && msg.headers.token)) { return false; }

    try      { return await SEA.verify(msg.headers.token, pub); }
    catch(e) { return false; }
}

/**
 * Check if msg represents a channel content put
 * @returns public key of channel, or false
 */
export function getContentChannel(context, msg) {
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
export function handleIncoming(context) {

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
export function buildOutgoingHandler(getChannelByKey) {
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
