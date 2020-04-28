import { GunPeer, SEA } from 'api/gun-peer';
import * as utils       from 'api/gun-utils';

const peers = {
    user : GunPeer('user'),
    group: GunPeer('group')
};

const user  = peers.user. user();
const group = peers.group.user();

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

        const channelPub = await channels.getOwnSecret(key);
        if (!channelPub) { return; } console.log('channel pub', channelPub);

        const channel = peers.group.user(channelPub);

        console.log('awaiting get name');
        const name = await channel.getSecret('name', pair);

        console.log('awaiting get permission');

        const permission =
            await channel.get('permissions').getSecret(principal.uuid, pair);

        console.log(name, permission); cb({ name, permission });
    });
};

// this creates a channel and gives current user READ access
// spin the READ stuff into new function & have this give current user ADMIN access

const addChannel = name => SEA.pair(null).then(pair => {

    group.auth(pair, null, async () => {

        // creating user with auth(pair) initializes alias to pair
        //? seems not to persist - otherwise, would leak private keys

        console.log(JSON.stringify(group.is.alias));

        //! auth(pair) neglects some setup performed by create(alias, pass)
        // see act g of User.prototype.create in sea.js

        group.back(-1).get(`~${ pair.pub }`).put({ epub: pair.epub });

        // store encrypted channel name in channel's space
        // grant user access to channel name

        await group.get('name').secret(name).then();
        await group.get('name').grant(user) .then();

        await group.get('permissions').get(principal.uuid).secret('a').then();
        await group.get('permissions').get(principal.uuid).grant(user).then();

        console.log('user', user);
        console.log('channel', group);

        group.leave(); //indexedDB.deleteDatabase('group');

        // store encrypted channel pubkey in user's space

        const hash = await utils.hash(pair.pub);
        user.get('channels').get(hash).secret(pair.pub);
    });
});

const reconnect = () => {
    peers.user .on('bye', 'http://localhost:8765/gun');
    peers.group.on('bye', 'http://localhost:8765/gun');

    //peers.user .opt('http://localhost:8765/gun');
    //peers.group.opt('http://localhost:8765/gun');
};

export default { login, register, logout, channels, addChannel, reconnect };
