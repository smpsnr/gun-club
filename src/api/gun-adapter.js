import AsyncLock        from 'async-lock';

import { GunPeer, SEA } from 'api/gun-peer';
import * as utils       from 'api/gun-utils';

/** @typedef { import('vendor/gun/types/static').IGunStatic }         Gun */
/** @typedef { import('vendor/gun/types/chain') .IGunChainReference } GunRef */

const peers = {
    user : GunPeer({ name: 'user',  useRTC: false }),
    group: GunPeer({ name: 'group', useRTC: true }),
};

const user = peers.user.user();
const lock = new AsyncLock();

let principal = {};

/**
 * Authenticate and set principal user
 *
 * @param {{ alias: string, password: string, id?: string }} _ - credentials
 * @param { function(Object):void } cb - callback to run on authenticated user
 *
 * @description pass 'id' from register callback to verify UUID hashing
 */
const login = ({ alias, password, id='' }, cb) => {
    user.auth(alias, password, async ack => {

        if (ack.err) { throw new Error(ack.err); }
        try { // retrieve metadata

            const uuid = await user.getOwnSecret('uuid');
            if (!uuid) { throw new Error('error getting uuid'); }

            if (id && id !== uuid) { throw new Error('mismatched id'); }
            principal = { uuid, ...user.is }; cb(principal); // callback

        } catch(error) { user.leave(); throw(error); }
    });
};

/**
 * Create a new user
 *
 * @param {{ alias: string, password: string }} _ - credentials
 * @param { function(string):void } cb - callback to run on UUID of new user
 */
const register = ({ alias, password }, cb) => {
    user.create(alias, password, ack => {

        if (ack.err) { throw new Error(ack.err); }
        try { // test authentication, set metadata

            user.auth(alias, password, async ack => {
                if (ack.err) { throw new Error(ack.err); }

                const uuid = await utils.hash(user.is);
                if (!uuid) { throw new Error('error generating uuid'); }

                user.get('uuid').secret(uuid, () => {
                    user.leave(); cb(uuid); // callback
                });
            });

        } catch(error) { user.delete(alias, password); throw(error); }
    });
};

const logout = () => { user.leave(); reconnect(); };

const reconnect = () => {
    peers.user .on('bye', 'http://localhost:8765/gun');
    peers.group.on('bye', 'http://localhost:8765/gun');

    //peers.user .on('out', { get: { '#': { '*': '' } } });
    //peers.group.on('out', { get: { '#': { '*': '' } } });

    //peers.user .opt('http://localhost:8765/gun');
    //peers.group.opt('http://localhost:8765/gun');
};

/**
 * Subscribe to channels; call cb for each channel of which principal is member
 * @param { function(Object):Object } cb - callback to run for each channel
 */
const channels = cb => {
    const pair     = user._.sea;
    const channels = user.get('channels');

    //! bug: map sometimes fires twice for same key
    // related to https://gun.eco/docs/API#important ?

    let lastKey = '';
    channels.map().once(async (val, key) => {

        //? does this actually help avoid duplicate keys?
        if (lastKey === key) { console.warn('ignoring duplicate'); return; }
        lastKey = key;         console.info('loading channel', key);

        const pub = await channels.getOwnSecret(key);
        if (!pub) { console.error('error getting channel pub'); return; }

        const channel = peers.group.user(pub);
        console.debug('awaiting channel metadata');

        const name = await channel.getSecret('name', pair);
        const perm = await channel.get('perms').getSecret(principal.uuid, pair);

        if (!name || !perm) { console.error('error getting metadata'); return; }

        //TODO: replace this with a Channel class
        cb({ name, perm, pub });
    });
};

/**
 * Create a new channel and give principal admin permissions
 *
 * @param { String } name - name of new channel
 * @description lock group peer until function returns
 */
const addChannel = name => lock.acquire('group', async done => {

    const pair    = await SEA.pair(null).then();
    const channel = peers.group.user();

    // note: creating user with auth(pair) initializes channel.is.alias to pair
    //TODO: make sure this is intentional & that pair never leaks

    channel.auth(pair, null, async ack => {
        if (ack.err) { done(new Error(ack.err)); }

        // do setup skipped by auth(pair) (usually done by create(alias, pass))
        //TODO: document bug. see act g of User.prototype.create in sea.js

        channel.back(-1).get(`~${ pair.pub }`).put({ epub: pair.epub });

        // put channel metadata (name & permissions)

        await channel.get('name').secret(name).then();
        await channel.get('name').grant(user).then();

        await channel.get('perms').get(principal.uuid).secret('admin').then();
        await channel.get('perms').get(principal.uuid).grant(user).then();

        // put private keys for access by admin user node (see authChannel())
        //? would it make more sense to put this *in* the admin user node?

        await channel.get('admin').get('pair').secret(pair).then();
        await channel.get('admin').get('pair').grant(user).then();

        // generate meta key for reading/writing the channel content node
        await channel.get('content').grant(user).then();

        channel.leave();

        // put encrypted pubkey in user's channels, keyed by hash of pubkey
        //TODO: threat model this & other channel metadata; audit hash function

        const hash = await utils.hash(pair.pub);
        user.get('channels').get(hash).secret(pair.pub); done();
    });
});

/**
 * Authenticates a channel over which principal has admin access,
 * then executes func(channel)
 *
 * @param { String } pub - public key of channel
 * @param { function(GunRef):Promise } func - function to run as channel
 *
 * @description lock group peer until function returns
 */
const authChannel = (pub, func) => lock.acquire('group', async done => {

    let channel = peers.group.user(pub);
    if (!channel) { done(new Error('no such channel')); }

    const pair = await channel.get('admin').getSecret('pair', user._.sea);
    if (!pair)    { done(new Error('error getting channel keys')); }

    channel = channel.user();

    channel.auth(pair, null, async ack => {
        if (ack.err) { done(new Error(ack.err)); }

        console.debug('executing privileged function');
        await func(channel); // do some authenticated operations

        console.debug('dropping privilege');
        channel.leave(); done();
    });
});

/**
 * Add user to channel over which principal is admin
 *
 * @param { string } channelPub - public key of channel
 * @param { string } userPub - public key of target user
 *
 * @description await this function to confirm sharing completed
 */
const shareChannel = async (channelPub, userPub) => {

    const to = peers.user.user(userPub);
    if (!to) { throw new Error('no such user'); }

    const uuid = await utils.hash({
        pub  : userPub,
        epub : await to.get('epub').then(),
        alias: await to.get('alias').then()

    }); if (!uuid) { throw new Error('error getting UUID of target user'); }

    authChannel(channelPub, async channel => {
        // grant target user access to channel metadata

        await channel.get('name').grant(to).then();
        await channel.get('admin').get('pair').grant(to).then();

        await channel.get('perms').get(uuid).secret('admin').then();
        await channel.get('perms').get(uuid).grant(to).then();
    });
};

/**
 * Join a channel previously shared with principal
 * @param { string } pub - public key of channel
 */
const joinChannel = async pub => {
    const pair = user._.sea;

    const channel = peers.group.user(pub);
    if (!channel) { throw new Error('no such channel'); }

    const name = await channel.getSecret('name', pair);
    const perm = await channel.get('perms').getSecret(principal.uuid, pair);

    if (!name || !perm) { throw new Error('error getting metadata'); }
    console.info(`joining '${ name }' with permission '${ perm }'`);

    const hash = await utils.hash(pub);
    user.get('channels').get(hash).secret(pub);
};

const writeChannel = (pub, path, data) => {
    const pair    = user._.sea;
    const channel = peers.group.user(pub);

    console.log('writing to channel');
    channel.get('content').path(path).putChannelSecret(data, pair, pub);
};

const readChannel = (pub, path, cb) => {
    const pair    = user._.sea;
    const channel = peers.group.user(pub);

    const root = channel.back(-1).get(pub).get('content');
    const content = channel.get('content');

    root.map().on(async (val, key) => {
        const data = await content.getChannelSecret(key, pair, pub);
        cb({ [key]: data });
    });
};

export default {
    login, register, logout, reconnect, channels,
    addChannel, shareChannel, joinChannel, writeChannel, readChannel
};
