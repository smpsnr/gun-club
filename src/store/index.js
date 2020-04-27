import Vue               from 'vue';

import Vuex              from 'vuex';
import VuexORM           from '@vuex-orm/core';

import User              from 'model/User';
import Channel           from 'model/Channel';

import user              from 'store/modules/user';

Vue.use(Vuex);

const database = new VuexORM.Database();
database.register(User); database.register(Channel);

export default new Vuex.Store({
    plugins: [ VuexORM.install(database) ],
    modules: { user }
});
