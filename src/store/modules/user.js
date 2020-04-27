import { REGISTER, LOGIN, ADD_CHANNEL, RECONNECT
} from 'store/actions/user';

import user    from 'api/gun-adapter';
import Channel from 'model/Channel';

const state = {
    channels: []
};

const actions = {

    [REGISTER]: ({ dispatch }, { alias, password }) => {
        try {
            user.register(alias, password, ack => {
                console.log('created user', ack);
                dispatch(LOGIN, { alias, password });
            });

        } catch(error) { console.error(error); }
    },

    [LOGIN]: (_, { alias, password }) => {
        try {
            user.login(alias, password, ack => {
                console.log('logged in', ack);
                user.channels(name => Channel.insert({ data: { name: name } }));
            });

        } catch(error) { console.error(error); }
    },

    [ADD_CHANNEL]: (_, name) => user.addChannel(name),

    [RECONNECT]: () => user.reconnect()
};

const mutations = {
    addChannel: (state, name) => state.channels.push(name)
};

export default { state, actions, mutations };
