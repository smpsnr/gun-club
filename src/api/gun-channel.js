import { SEA } from 'api/gun-peer';

/** @typedef { import('vendor/gun/types/chain').IGunChainReference } GunRef */

/** @typedef { import('vendor/gun/types/types').IGunCryptoKeyPair } KeyPair */
/** @typedef { import('vendor/gun/types/types').AckCallback }       Callback */

//TODO: 'pub' in below functions should be a hashed uuid or something

/**
 * Write encrypted data to channel content node
 *
 * @param { GunRef } channel
 * @param { string } pub - public key of channel
 * @param { Array<String> } path
 * @param { Object } data
 * @param { KeyPair } pair - principal keys
 * @param { Callback } [callback]
 */
export const putChannelSecret = async function(channel, pub, path, data, pair, callback) {
    // get channel content meta key

    let sec = await channel.get('trust').get(pair.pub).get('content').then();
    if (!sec) { console.error('error getting secret key'); return; }

    const mix = await SEA.secret(await channel.get('epub').then(), pair);

    sec       = await SEA.decrypt(sec, mix);
    const enc = await SEA.encrypt(data, sec);

    // put encrypted data from channel content node

    let content = channel.back(-1).get('content').get(pub);

    const parentPath = path.slice(0, path.length-1); //console.log('parentpath', parentPath);
    const dataKey    = path[path.length-1]; //console.log('dataKey', dataKey);

    // handle key / path conflicts,
    // i.e. (put 'x' to ['parent']) then (put 'x' to ['parent', 'child'])

    if (parentPath.length > 0) {
        content = content.path(parentPath);
        if (await content.then()) { await content.put({}).then(); }
    }
    return content.get(dataKey).put(enc, callback);
};

/**
 * Get and decrypt data from channel content node
 *
 * @param { GunRef } channel
 * @param { String } pub - public key of channel
 * @param { Array<String> } path
 * @param { KeyPair } pair - principal keys
 */
export const getChannelSecret = async function(channel, pub, path, pair) {
    // get channel content meta key

    let sec = await channel.get('trust').get(pair.pub).get('content').then();
    if (!sec) { console.error('error getting secret key'); return; }

    // get encrypted data from channel content node

    const enc = await channel.back(-1).get('content').get(pub).path(path).then();
    if (!enc) { console.error(`error getting '${ path }'`); return; }

    const mix = await SEA.secret(await channel.get('epub').then(), pair);

    sec = await SEA.decrypt(sec, mix);
    return SEA.decrypt(enc, sec);
};
