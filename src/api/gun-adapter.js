import AsyncLock       from 'async-lock';
import { SEA }         from 'api/gun-peer';

import * as GunChannel from 'gun-api/gun-channel';
import * as utils      from 'api/gun-utils';

import network         from 'api/gun-network';

const lock = new AsyncLock();
let principal = {};

const peers = network.join();
const user  = peers.user.user();

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
    for (const peer in peers.user ._.opt.peers) { peers.user .on('bye', peer); }
    for (const peer in peers.group._.opt.peers) { peers.group.on('bye', peer); }

    //peers.user .on('out', { get: { '#': { '*': '' } } });
    //peers.group.on('out', { get: { '#': { '*': '' } } });
};

/**
 * Subscribe to peer events
 * @param { function(Object):Object } cb - callback to run for each peer event
 */
const peerEvents = cb => {

    const log = function(ctx, peer, node, type) {
        ctx.to.next(peer); cb({ type,  node, peerId: peer.id });
    };

    for (const [name, node] of Object.entries(peers)) {
        node.on('hi',  function(peer) { log(this, peer, name, 'hi'); });
        node.on('bye', function(peer) { log(this, peer, name, 'bye'); });
    }
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
        let token = null; if (perm === 'admin' || perm === 'write') {

            token = await channel.get('tokens').getSecret(principal.uuid, pair);
            if (!token) { console.error('error getting write token'); return; }
        }

        //TODO: replace this with a Channel class
        cb({ name, perm, pub, token });
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

        // put channel metadata (name, permission, token)

        await channel.get('name').secret(name).then();
        await channel.get('name').grant(user).then();

        await channel.get('perms').get(principal.uuid).secret('admin').then();
        await channel.get('perms').get(principal.uuid).grant(user).then();

        // generate & sign write access token
        const token = await SEA.sign(SEA.random(32).toString('base64'), pair);

        await channel.get('tokens').get(principal.uuid).secret(token).then();
        await channel.get('tokens').get(principal.uuid).grant(user).then();

        // put private keys for access by admin user node (see authChannel())
        //? would it make more sense to put this *in* the admin user node?

        await channel.get('admin').get('pair').secret(pair).then();
        await channel.get('admin').get('pair').grant(user).then();

        // generate meta content key
        await channel.get('content').grant(user).then();

        channel.leave(); // create content node outside of channel
        await channel.back(-1).get('content').get(pair.pub).then();

        // put encrypted pubkey & token in user's channels, keyed by hash of pubkey
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
 * @param {
            function(import('types').GunRef,
 *                   import('types').KeyPair):Promise

 *        } func - function to run as channel
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
        await func(channel, pair); // do some authenticated operations

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
const shareChannel = async (channelPub, userPub, perm) => {

    const to = peers.user.user(userPub);
    if (!to) { throw new Error('no such user'); }

    const uuid = await utils.hash({
        pub  : userPub,
        epub : await to.get('epub').then(),
        alias: await to.get('alias').then()

    }); if (!uuid) { throw new Error('error getting UUID of target user'); }

    authChannel(channelPub, async (channel, pair) => {

        switch(perm) {
            case 'admin': {
                await channel.get('admin').get('pair').grant(to).then();

            } case 'write': {
                const token = await SEA.sign(SEA.random(32).toString('base64'), pair);

                await channel.get('tokens').get(uuid).secret(token).then();
                await channel.get('tokens').get(uuid).grant(to).then();

            } case 'read': {
                await channel.get('name').grant(to).then();
                await channel.get('content').grant(to).then();

            } default: {
                await channel.get('perms').get(uuid).secret(perm).then();
                await channel.get('perms').get(uuid).grant(to).then();
            }
        }
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

    console.log('perm is', perm);

    if (!name || !perm) { throw new Error('error getting metadata'); }
    let token = null; if (perm === 'admin' || perm === 'write') {

        token = await channel.get('tokens').getSecret(principal.uuid, pair);
        if (!token) { console.error('error getting write token'); return; }

    } console.info(`joining '${ name }' with permission '${ perm }'`);

    const hash = await utils.hash(pub);
    user.get('channels').get(hash).secret(pub);
};

const writeChannel = (pub, path, data) => {
    const pair    = user._.sea;
    const channel = peers.group.user(pub);

    // write channel content
    GunChannel.putChannelSecret(channel, pub, path, data, pair);
};

const readChannel = (pub, path, cb) => {
    const pair    = user._.sea;
    const channel = peers.group.user(pub);

    // get the actual content node & subscribe to updates

    const content = channel.back(-1).get('content').get(pub);
    if (path && path[0]) { content.path(path); }

    content.map().on(async (val, key) => {
        // get all paths on this key (recursive)

        content.loadPathsAt([key]).then(async paths => {
            for (const path of paths) {

                // read channel content

                const data = await GunChannel.getChannelSecret(
                    channel, pub, path, pair);

                // nest data inside new object according to path

                const obj = path.reduceRight((acc, cur) =>
                    ({ [cur]: acc }), data); cb(obj); // callback
            }
        });
    });
};

/**
 * Find user by public key
 * @param { string } userPub - public key of user
 */
const findUser = async userPub => {
    const to = peers.user.user(userPub);
    if (!to) { throw new Error('no such user'); }

    const foundUser = {
        pub  : userPub,
        epub : await to.get('epub').then(),
        alias: await to.get('alias').then()

    }; if (!foundUser.alias) { throw new Error('no such user'); }

    const uuid = await utils.hash(foundUser);
    if (!uuid) { throw new Error('error getting UUID of target user'); }

    return { uuid, ...foundUser };
};

const chats = cb => {
    const chats = user.get('chats');
    chats.map().once(async (val, key) => {

        const pub = await chats.getOwnSecret(key);
        if (!pub) { console.error('error getting chat pub'); return; }

        findUser(pub).then(chatUser => cb(chatUser))
            .catch(e => console.log(e.message));
    });
};

const startChat = (uuid, pub) => {
    user.get('chats').get(uuid).secret(pub);
};

const messages = async (userPub, cb) => {

    const from = peers.user.user(userPub);
    if (!from) { throw new Error('no such user'); }

    const pair     = user._.sea;
    const messages = from.get('messages').get(principal.uuid);

    messages.map().once(async (val, key) => {
        console.info(key, val);

        const msg = await messages.getSecret(key, pair);
        console.log(msg);
        cb({ time: key, msg });
    });
};

const sendMessage = async (userPub, message) => {
    const to = peers.user.user(userPub);
    if (!to) { throw new Error('no such user'); }

    const uuid = await utils.hash({
        pub  : userPub,
        epub : await to.get('epub').then(),
        alias: await to.get('alias').then()

    }); if (!uuid) { throw new Error('error getting UUID of target user'); }

    const now = new Date().getTime();

    await user.get('messages').get(uuid).get(now).secret(message).then();
    await user.get('messages').get(uuid).get(now).grant(to).then();
};

export default {
    login, register, logout, reconnect, channels, peerEvents,
    addChannel, shareChannel, joinChannel, writeChannel, readChannel,
    findUser, chats, startChat, messages, sendMessage
};
