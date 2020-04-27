import { REGISTER, LOGIN, LOGOUT, ADD_CHANNEL, RECONNECT
} from 'store/actions/user';

import client from 'api/gun-adapter';

const state = {
    channels: [], principal: null
};

const actions = {

    [REGISTER]: ({ dispatch }, { alias, password }) => {
        try {
            client.register(alias, password, user => {
                console.log('created user', user);
                dispatch(LOGIN, { alias, password });
            });

        } catch(error) { console.error(error); }
    },

    [LOGIN]: ({ commit }, { alias, password }) => {
        try {
            client.login(alias, password, user => {
                console.log('logged in', user);

                commit('setPrincipal', user);
                client.channels(name => commit('addChannel', name));
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
    setPrincipal: (state, user) => state.principal = user,
    addChannel  : (state, name) => state.channels.push(name),

    clearPrincipal: state => {
        state.principal = null; state.channels = [];
    }
};

export default { state, actions, mutations };
