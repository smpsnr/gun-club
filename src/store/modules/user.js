import { REGISTER, LOGIN, LOGOUT, ADD_CHANNEL, RECONNECT
} from 'store/actions/user';

import client from 'api/gun-adapter';

const state = {
    channels: [], principal: null
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

    [LOGOUT]: ({ commit }) => {
        client.logout(); commit('clearPrincipal');
    },

    [ADD_CHANNEL]: (_, name) => client.addChannel(name),

    [RECONNECT]: () => client.reconnect()
};

const mutations = {
    setPrincipal: (state, user)    => state.principal = user,
    addChannel  : (state, channel) => state.channels.push(channel),

    clearPrincipal: state => {
        state.principal = null; state.channels = [];
    }
};

export default { state, actions, mutations };
