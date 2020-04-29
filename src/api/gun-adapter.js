import AsyncLock        from 'async-lock';

import { GunPeer, SEA } from 'api/gun-peer';
import * as utils       from 'api/gun-utils';

const peers = {
    user : GunPeer('user'),
    group: GunPeer('group'),
};

const user = peers.user.user();
const lock = new AsyncLock();

let principal = {};

const login = ({ alias, password, id='' }, cb) =>
    user.auth(alias, password, async ack => {

        if (ack.err) { throw new Error(ack.err); }
        try { // retrieve metadata

            const uuid = await user.getOwnSecret('uuid');
            if (!uuid) { throw new Error('error getting uuid'); }

            if (id && id !== uuid) { throw new Error('mismatched id'); }
            principal = { uuid, ...user.is }; cb(principal); // callback

        } catch(error) { user.leave(); throw(error); }
    });

const register = ({ alias, password }, cb) =>
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

const logout = () => user.leave();

const channels = cb => {

    const pair = user._.sea;
    const channels = user.get('channels');

    channels.map().once(async (val, key) => {
        console.log(key, val);

        const pub = await channels.getOwnSecret(key);
        if (!pub) { return; } console.log('channel pub', pub);

        const channel = peers.group.user(pub);

        console.log('awaiting get name');
        const name = await channel.getSecret('name', pair);

        console.log('awaiting get permission');

        const permission =
            await channel.get('permissions').getSecret(principal.uuid, pair);

        console.log(name, permission); cb({ name, permission, pub });
    });
};

/**
 * Create a new channel and give the current user admin access
 */
const addChannel = name => lock.acquire('group', async done => {

    const pair    = await SEA.pair(null).then();
    const channel = peers.group.user();

    channel.auth(pair, null, async ack => {
        if (ack.err) { done(new Error(ack.err)); }

        //? creating user with auth(pair) initializes alias to pair
        // does this leak keys? see console.log(JSON.stringify(group.is.alias))

        //! auth(pair) neglects some setup performed by create(alias, pass)
        // see act g of User.prototype.create in sea.js

        channel.back(-1).get(`~${ pair.pub }`).put({ epub: pair.epub });

        // store encrypted channel name in channel's space
        // grant user access to channel name

        await channel.get('pair').secret(pair).then();
        await channel.get('pair').grant(user) .then();

        await channel.get('name').secret(name).then();
        await channel.get('name').grant(user) .then();

        await channel.get('permissions').get(principal.uuid).secret('a').then();
        await channel.get('permissions').get(principal.uuid).grant(user).then();

        console.log('user', user);
        console.log('channel', channel);

        channel.leave(); //indexedDB.deleteDatabase('group');

        // store encrypted channel pubkey in user's space

        const hash = await utils.hash(pair.pub);
        user.get('channels').get(hash).secret(pair.pub); done();
    });
});

/**
 * Authenticate a channel over which you have admin access,
 * then execute func(channel)
 */
const authChannel = (pub, func) => lock.acquire('group', async done => {

    let channel = peers.group.user(pub);
    if (!channel) { done(new Error('no such channel')); }

    const pair = await channel.getSecret('pair', user._.sea);
    if (!pair)    { done(new Error('error getting channel keys')); }

    channel = channel.user();

    channel.auth(pair, null, async ack => {
        if (ack.err) { done(new Error(ack.err)); }

        console.log('doing function as channel...');
        await func(channel); // do some authenticated operations

        console.log('finished channel function');
        channel.leave(); done();
    });
});

/**
 * Add a user to a channel over which you have admin access
 */
const shareChannel = (channelPub, userPub) => {

    const to = peers.user.user(userPub);
    if (!to) { throw new Error('no such user'); }

    console.log('sharing...');
    authChannel(channelPub, async channel => {

        await channel.get('pair').grant(to).then();
        await channel.get('name').grant(to).then();

        const uuid = await utils.hash({
            pub  : userPub,
            epub : await to.get('epub') .then(),
            alias: await to.get('alias').then()
        });

        console.log('setting perm');
        await channel.get('permissions').get(uuid).secret('a').then();

        console.log('granting perm');
        await channel.get('permissions').get(uuid).grant(to).then();

        console.log('shared');
    });
};

/**
 * Join a channel that has been shared with current user
 */
const joinChannel = async pub => {

    const pair = user._.sea;
    const channel = peers.group.user(pub);

    console.log('awaiting get name');
    const name = await channel.getSecret('name', pair);

    console.log('awaiting get permission');
    const permission =
        await channel.get('permissions').getSecret(principal.uuid, pair);

    console.log(`joining '${ name }' with permission '${ permission }'`);

    const hash = await utils.hash(pub);
    user.get('channels').get(hash).secret(pub);
};

const reconnect = () => {
    peers.user .on('bye', 'http://localhost:8765/gun');
    peers.group.on('bye', 'http://localhost:8765/gun');

    //peers.user .opt('http://localhost:8765/gun');
    //peers.group.opt('http://localhost:8765/gun');
};

export default {
    login, register, logout, reconnect,
    channels, addChannel, shareChannel, joinChannel
};
