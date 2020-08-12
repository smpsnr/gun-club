import Vue       from 'vue';
import VueRouter from 'vue-router';

import store from './store';

const App = () => import(
    /* webpackChunkName: "app" */
    /* webpackPrefetch: true */ './App.vue');

Vue.use(VueRouter);
const router = new VueRouter({ routes: [
    { path: '*', name: 'app', component: App }
] });

Vue.config.productionTip = false;
//@ts-ignore
new Vue({ router, store, render: h => h(App) }).$mount('#app');
