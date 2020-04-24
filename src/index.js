import Vue   from 'vue';
import store from './store';

const App = () => import(
    /* webpackChunkName: "app" */
    /* webpackPrefetch: true */ './App.vue');

new Vue({ store, render: h => h(App) }).$mount('#app');
