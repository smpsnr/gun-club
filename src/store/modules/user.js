import client from 'api/gun-adapter';

import { REGISTER, LOGIN, LOGOUT, RECONNECT,
    ADD_CHANNEL, SHARE_CHANNEL, JOIN_CHANNEL, WRITE_CHANNEL, READ_CHANNEL
} from 'store/actions/user';

const state = {
    channels: [], contents: {}, principal: null
};

const actions = {

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
            });

        } catch(error) { console.error(error); }
    },

    [LOGOUT]: ({ commit }) => { client.logout(); commit('clearPrincipal'); },

    [RECONNECT]: () => client.reconnect(),

    [ADD_CHANNEL]: (_, name) => client.addChannel(name),

    [SHARE_CHANNEL]: (_, { channelPub, userPub }) =>
        client.shareChannel(channelPub, userPub),

    [JOIN_CHANNEL]: (_, pub) => client.joinChannel(pub),

    [WRITE_CHANNEL]: (_, { pub, path, data }) =>
        client.writeChannel(pub, path, data),

    [READ_CHANNEL]: ({ commit }, { pub, path }) =>
        client.readChannel(pub, path, content =>
            commit('updateContent', { pub, content }))
};

const mutations = {
    setPrincipal: (state, user)    => state.principal = user,
    addChannel  : (state, channel) => state.channels.push(channel),

    updateContent: (state, { pub, content }) => {
        console.log(content);
        if (!state.contents[pub]) { state.contents[pub] = {}; }
        Object.assign(state.contents[pub], content);
    },

    clearPrincipal: state => {
        state.principal = null; state.channels = [];
    }
};

export default { state, actions, mutations };
