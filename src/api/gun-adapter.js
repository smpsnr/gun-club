import { GunPeer, SEA } from './gun-peer';

const gun = GunPeer('user');
const user = gun.user();

const login = (alias, password, cb) => user.auth(alias, password, ack => {
    if (ack.err) { user.leave(); throw new Error(ack.err); } cb(ack);
});

const register = (alias, password, cb) => user.create(alias, password, ack => {
    if (ack.err) { user.leave(); throw new Error(ack.err); } cb(ack);
});

const channels = cb => {

    const pair = user._.sea;
    const channels = user.get('channels');

    channels.map().once(async (val, key) => {
        console.log(key, val);

        const channelPub = await channels.getSecret(key, pair);
        if (!channelPub) { return; } console.log('channel pub', channelPub);

        const channel = gun.user(channelPub);

        console.log('awaiting get secret');
        const channelName = await channel.getSecret('name', pair);

        console.log(channelName); cb(channelName);
    });
};

const addChannel = name => SEA.pair(null).then(pair => {

    const channel = GunPeer('group').user();
    channel.auth(pair, null, async () => {

        // creating user with auth(pair) initializes alias to pair
        //? seems not to persist - otherwise, would leak private keys

        console.log(JSON.stringify(channel.is.alias));

        //! auth(pair) neglects some setup performed by create(alias, pass)
        // see act g of User.prototype.create in sea.js

        const root = channel.back(-1);
        root.get(`~${ pair.pub }`).put({ epub: pair.epub });

        // store encrypted channel name in channel's space
        // grant user access to channel name

        await channel.get('name').secret(name).then();
        await channel.get('name').grant(user).then();

        console.log('user', user);
        console.log('channel', channel);

        channel.leave(); //indexedDB.deleteDatabase('group');

        // store encrypted channel pubkey in user's space

        const hash = await SEA.work(pair.pub, null);
        user.get('channels').get(hash).secret(pair.pub);
    });
});

export default { login, register, channels, addChannel };
