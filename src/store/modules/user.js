import Vue    from 'vue';
import client from 'api/gun-adapter';

import { INIT, REGISTER, LOGIN, LOGOUT, RECONNECT,
    ADD_CHANNEL, SHARE_CHANNEL, JOIN_CHANNEL, WRITE_CHANNEL, READ_CHANNEL,
    FIND_USER, START_CHAT, WRITE_CHAT, READ_CHAT
} from 'store/actions/user';

const state = {
    principal: null,
    channels     : [], peers   : [],
    channelsByKey: {}, contents: {},
    chats        : [], messages: {}
};

const getters = {
    getChannelByKey: state => key => state.channels[state.channelsByKey[key]]
};

const actions = {

    [INIT]: ({ commit }) => {
        client.peerEvents(event => commit('updatePeers', event));
    },

    [REGISTER]: ({ dispatch }, { alias, password }) => {
        try {
            client.register({ alias, password }, id => {
                console.log('created user', id);
                dispatch(LOGIN, { alias, password, id });
            });

        } catch(error) { console.error(error); }
    },

    [LOGIN]: ({ commit }, { alias, password, id='' }) => {
        try {
            client.login({ alias, password, id }, user => {
                console.log('logged in', user);

                commit('setPrincipal', user);
                client.channels(channel => commit('addChannel', channel));
                client.chats   (chat    => commit('addChat',    chat));
            });

        } catch(error) { console.error(error); }
    },

    [LOGOUT]: ({ commit }) => { client.logout(); commit('clearPrincipal'); },

    [RECONNECT]: () => client.reconnect(),

    [ADD_CHANNEL]: (_, name) => client.addChannel(name),

    [SHARE_CHANNEL]: (_, { channelPub, userPub, perm }) =>
        client.shareChannel(channelPub, userPub, perm),

    [JOIN_CHANNEL]: (_, pub) => client.joinChannel(pub),

    [WRITE_CHANNEL]: (_, { pub, path, data }) =>
        client.writeChannel(pub, path.split('/'), data),

    [READ_CHANNEL]: ({ commit }, { pub, path }) =>
        client.readChannel(pub, path.split('/'), newContent =>
            commit('updateContent', { pub, newContent })),

    [FIND_USER]: (_, pub) => new Promise(resolve =>
        client.findUser(pub).then(user => resolve(user))
            .catch(e => console.log(e.message))),

    [START_CHAT]: (_, partner) => client.startChat(partner.uuid, partner.pub),

    [WRITE_CHAT]: (_, { pub, data }) => client.sendMessage(pub, data),

    [READ_CHAT]: ({ commit }, pub) => client.messages(pub, newMessage =>
        commit('addMessage', { pub, newMessage }))
};

const mutations = {
    setPrincipal: (state, user) => state.principal = user,

    clearPrincipal: state => {
        state.principal = null; state.channels = [];
    },

    addChannel: (state, channel) => {
        const len = state.channels.push(channel);
        state.channelsByKey[channel.pub] = len-1;
    },

    updateContent: (state, { pub, newContent }) => {
        const curContent = state.contents[pub];
        const merge = (cur, src) => {

            Object.entries(src).forEach(([key, val]) => {

                if (key in cur && val      instanceof Object &&
                                  cur[key] instanceof Object) {

                    src[key] = { ...val, ...merge(cur[key], val) };
                }
            }); return { ...cur, ...src };
        };

        if (!curContent) { Vue.set(state.contents, pub, newContent); }
        else             { state.contents[pub] = merge(curContent, newContent); }
    },

    addMessage: (state, { pub, newMessage }) => {
        const curMessages = state.messages[pub];
        if (!curMessages) { Vue.set(state.messages, pub, [newMessage]); }
        else              { curMessages.push(newMessage); }
    },

    addChat: (state, chat) => {
        state.chats.push(chat);
    },

    updatePeers: (state, event) => {
        switch(event.type) {

            case 'hi': {
                console.debug(`%c 🉑 ${ event.peerId }`, 'color: green');
                state.peers.push(event.peerId);
            } break;

            case 'bye': {
                const idx = state.peers.indexOf(event.peerId); if (idx >= 0) {
                    console.debug(`%c ⭕ ${ event.peerId }`, 'color: red');
                    state.peers.splice(idx, 1);
                }
            } break;
        }
    }
};

export default { state, getters, actions, mutations };
