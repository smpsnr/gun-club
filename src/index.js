import Vue   from 'vue';
import store from './store';

const App = () => import(
    /* webpackChunkName: "app" */
    /* webpackPrefetch: true */ './App.vue');

Vue.config.productionTip = false;
//@ts-ignore
new Vue({ store, render: h => h(App) }).$mount('#app');
