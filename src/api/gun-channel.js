import { SEA } from 'api/gun-peer';

/** @typedef { import('vendor/gun/types/chain').IGunChainReference } GunRef */

/** @typedef { import('vendor/gun/types/types').IGunCryptoKeyPair } KeyPair */
/** @typedef { import('vendor/gun/types/types').AckCallback }       Callback */

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
