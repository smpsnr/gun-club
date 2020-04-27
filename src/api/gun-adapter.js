import { GunPeer, SEA } from './gun-peer';

const peers = {
    user : GunPeer('user'),
    group: GunPeer('group')
};

const user  = peers.user. user();
const group = peers.group.user();

const login = (alias, password, cb) => user.auth(alias, password, ack => {
    if (ack.err) { user.leave(); throw new Error(ack.err); } cb(user.is);
});

const register = (alias, password, cb) => user.create(alias, password, ack => {
    if (ack.err) { user.leave(); throw new Error(ack.err); } cb(user.is);
});

const logout = () => user.leave();

const channels = cb => {

    const pair = user._.sea;
    const channels = user.get('channels');

    channels.map().once(async (val, key) => {
        console.log(key, val);

        const channelPub = await channels.getSecret(key, pair);
        if (!channelPub) { return; } console.log('channel pub', channelPub);

        const channel = peers.group.user(channelPub);

        console.log('awaiting get secret');
        const channelName = await channel.getSecret('name', pair);

        console.log(channelName); cb(channelName);
    });
};

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
        await group.get('name').grant(user).then();

        console.log('user', user);
        console.log('channel', group);

        group.leave(); //indexedDB.deleteDatabase('group');

        // store encrypted channel pubkey in user's space

        const hash = await SEA.work(pair.pub, null);
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
