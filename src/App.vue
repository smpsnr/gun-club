<template>
<main>

    <section v-if="!profile">
        <h3> GunDB demo </h3> <!-- login/register -->

        <form v-if="!profile">
            <input v-model="credentials.alias" placeholder="Username"
                   type="text" autocomplete="username"> <br>

            <input v-model="credentials.password" placeholder="Password"
                   type="password" autocomplete="current-password">

            <p>
                <input value="Login"    type="button" @click="login()">
                <input value="Register" type="button" @click="register()">
            </p>
        </form>
    </section>

    <section v-else>
        <h3> Profile </h3> <!-- profile data -->

        <input value="Logout" type="button" @click="logout()">
        <table>
            <tr> <th> Alias </th> <th> UUID </th> <th> Pub </th> </tr>
            <tr>
                <td>             {{ profile.alias }} </td>
                <td class="key"> {{ profile.uuid }}  </td>
                <td>
                    <input id="principal-pub" :value="profile.pub"
                           type="text" readonly="true" class="key">

                    <input value="Copy" type="button"
                           @click="copy('#principal-pub')">
                </td>
            </tr>
        </table>

        <Channels />

    </section>

    <footer>
        <table>
            <!-- debug data -->
            <tr>
                <th> Peers              </th>
                <td> {{ peers.length }} </td>
                <td>
                    <input value="Reconnect" type="button"
                           @click="reconnect()">
                </td>
            </tr>
            <tr>
                <th> Disk          </th>
                <td> {{ storage }} </td>
                <td>
                    <input value="Clear" type="button"
                           @click="clearStorage()" :disabled="clearNum > 0">
                </td>
            </tr>

        </table>
    </footer>

</main>
</template>

<script>
import { mapState } from 'vuex';

import { INIT, REGISTER, LOGIN, LOGOUT, RECONNECT
} from 'store/actions/user';

import Channels from 'component/Channels.vue';

export default {
    name: 'App',
    components: { Channels },

    data: () => ({
        credentials: { alias: '', password: '' },
        storage: '', clearNum: 0
    }),

    computed: mapState({
        profile: state => state.user.principal,
        peers  : state => state.user.peers
    }),

    created() {
        this.$store.dispatch(INIT);
    },

    mounted() {
        const mega = 1000 * 1000;
        const checkStorage = () => navigator.storage.estimate().then(space => {

            const usage = space.usage < mega?
                `${ (space.usage / 1000).toFixed(2) } kB` :
                `${ (space.usage / mega).toFixed(2) } MB`;

            const quota = Math.round(space.quota / mega);
            this.storage = `${ usage } used out of ${ quota } MB`;

        }); checkStorage();
        setInterval(checkStorage, 1000);
    },

    methods: {
        register()  { this.$store.dispatch(REGISTER, this.credentials); },
        login()     { this.$store.dispatch(LOGIN,    this.credentials); },

        logout()    { this.$store.dispatch(LOGOUT); },
        reconnect() { this.$store.dispatch(RECONNECT); },

        clearStorage() {
            for (let name of [ 'user', 'group' ]) {
                const req = indexedDB.deleteDatabase(name);   this.clearNum++;

                req.onsuccess = () => {
                    console.info(`deleted ${ name }`);        this.clearNum--;

                }; req.onerror = () => {
                    console.warn(`error deleting ${ name }`); this.clearNum--;
                };
            }
        },

        copy(id) {
            document.querySelector(id).select();
            document.execCommand('copy');
        }
    }
};

</script>

<style>
    .key   { overflow: hidden; text-overflow: ellipsis; max-width: 8ch; }
    .modal {
        position: fixed;

        left: 0;     top: 0;
        width: 100%; height: 100%;

        background: rgba(0, 0, 0, 0.4);
    }
    .modal > section {
        position: relative;
        width: 85%; margin: 2.5% auto;

        padding: 1em 2em 2em 2em;
        background: white;
    }
    h3 { display: inline-block; }
    th, td { text-align: left; padding-right: 1ch; }

    footer {
        position: fixed; left: 0; bottom: 0; width: 100%;
        background: lightgray;
    }
</style>
