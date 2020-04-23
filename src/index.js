import { GunPeer, SEA } from './gun-peer';

const loginBtn        = document.getElementById('login');
const registerBtn     = document.getElementById('register');

const usernameInpt    = document.getElementById('username');
const passwordInpt    = document.getElementById('password');

const newChannelInpt  = document.getElementById('new-channel-name');
const newChannelBtn   = document.getElementById('new-channel');

const postChannelInpt = document.getElementById('post-channel-name');
const postMsgInpt     = document.getElementById('post-channel-msg');
const postMsgBtn      = document.getElementById('post-channel');

const gun = GunPeer('user');
const user = gun.user();

async function login(username, password) {
    if (!password) { username = JSON.parse(username); password = null; }

    user.auth(username, password, async ack => {
        console.log(user);

        if (ack.err) { console.log(ack.err); }
        else {
            console.log('logged in');

            const pair = user._.sea;
            const channels = user.get('channels');

            channels.map().once(async (val, key) => {
                console.log(key, val);

                const channelPub = await channels.getSecret(key, pair);
                if (!channelPub) { return; } console.log('channel pub', channelPub);

                const channel = gun.user(channelPub);

                console.log('awaiting get secret');
                const channelName = await channel.getSecret('name', pair);

                console.log(channelName);
            });
        }
    });
}

loginBtn.onclick = () => login(usernameInpt.value, passwordInpt.value);

registerBtn.onclick = () => {
    const username = usernameInpt.value;
    const password = passwordInpt.value;

    user.create(username, password, ack => {
        console.log(ack);
        if (ack.err) { user.leave(); }
        else         { console.log('created user'); login(username, password); }
    });
};

newChannelBtn.onclick = async () => {

    const channelName = newChannelInpt.value;
    const channelPair = await SEA.pair(null);

    const channel = GunPeer('group').user();

    channel.auth(channelPair, null, async () => {

        // creating user with auth(pair) initializes alias to pair
        //? seems not to persist - otherwise, would leak private keys

        console.log(JSON.stringify(channel.is.alias));

        //! auth(pair) neglects some setup performed by create(alias, pass)
        // see act g of User.prototype.create in sea.js

        const root = channel.back(-1);
        root.get(`~${ channelPair.pub }`).put({ epub: channelPair.epub });

        // store encrypted channel name in channel's space
        // grant user access to channel name

        await channel.get('name').secret(channelName).then();
        await channel.get('name').grant(user).then();

        console.log('user', user);
        console.log('channel', channel);

        channel.leave(); //indexedDB.deleteDatabase('group');

        // store encrypted channel pubkey in user's space

        const hash = await SEA.work(channelPair.pub, null);
        user.get('channels').get(hash).secret(channelPair.pub);
    });

    //* alternatively, call .create with a random alias and password

    //channel.create(Gun.text.random(24), Gun.text.random(24), () => {
    //let channelPair = channel._.sea;
};

// nothing below here works yet

async function writeToChannel(channelName, message) {
    console.log('writing to ' + channelName);
    const channelPairEnc = await user.get('channels').get(channelName).then();

    const userPair    = (user._||{}).sea;
    const channelPair = await SEA.decrypt(channelPairEnc, userPair);

    const messageEnc = await SEA.encrypt(message, channelPair);
    gun.get('channels').get(channelName).set(messageEnc);
}

async function readChannel(channelName) {
    const channelPairEnc = await user.get('channels').get(channelName).then();

    const userPair    = (user._||{}).sea;
    const channelPair = await SEA.decrypt(channelPairEnc, userPair);

    gun.get('channels').get(channelName).valMapEnd(async messageEnc => {
        console.log(channelName + ': ' + await SEA.decrypt(messageEnc, channelPair));
    });
}

postMsgBtn.onclick = () => {
    writeToChannel(postChannelInpt.value, postMsgInpt.value);
};
