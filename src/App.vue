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

        <h3> Channels </h3> <!-- profile channels -->
        <form>
            <input v-model="newChannelName" placeholder="Name" type="text">
            <input value="Create" type="button" @click="addChannel()">
        </form>

        <form>
            <input v-model="joinChannelPub" placeholder="Pub" type="text">
            <input value="Join" type="button" @click="joinChannel()">
        </form> <br>

        <table>
            <tr>
                <th> Name </th> <th> Perm </th> <th> Pub </th> <th> Share </th>
            </tr>

            <tr v-for="(channel, index) in channels" :key="channel.pub">
                <td> {{ channel.name }} </td>
                <td>
                    <input :value="channel.perm" type="button"
                           @click="openChannelModal(channel)">
                </td>
                <td>
                    <input v-model="sharePubs[index]" placeholder="Pub"
                           type="text" class="key">

                    <select v-model="sharePerms[index]">
                        <option value="read">  read  </option>
                        <option value="write"> write </option>
                        <option value="admin"> admin </option>
                    </select>

                    <input value="Share" type="button"
                           @click="shareChannel(index)">
                </td>
                <td>
                    <input :id="`channel-${ index }-pub`" :value="channel.pub"
                           type="text" readonly="true" class="key">

                    <input value="Copy" type="button"
                           @click="copy(`#channel-${ index }-pub`)">
                </td>
            </tr>

        </table>
    </section>

    <!-- channel modal -->
    <div v-if="showChannel" class="modal" @click="showChannel = false">
        <section @click="$event.stopPropagation()">

            <h2> #{{ curChannel.name }} </h2> <!-- channel data -->
            <table>
                <tr> <th> Key </th> <th> Value </th> </tr>
                <tr v-for="(val, key) in contents[curChannel.pub]" :key="key">

                    <td> {{ key }} </td>
                    <td> {{ val }} </td>
                </tr>
            </table> <br>

            <form>
                <input v-model="writePath" placeholder="Path" type="text">
                <input v-model="writeData" placeholder="Data" type="text">

                <input value="Write" type="button" @click="writeChannel()">
            </form>

        </section>
    </div>

    <footer>
        <h3> Debug </h3> <!-- debug data -->
        <input value="Reconnect peers" type="button" @click="reconnect()">
        <input value="Clear storage"   type="button" @click="clearStorage()">
        <span> {{ storage }} </span>
    </footer>

</main>
</template>

<script>
import { mapState } from 'vuex';

import { REGISTER, LOGIN, LOGOUT, RECONNECT,
    ADD_CHANNEL, SHARE_CHANNEL, JOIN_CHANNEL, WRITE_CHANNEL, READ_CHANNEL
} from 'store/actions/user';

export default {
    name: 'App',

    data: () => ({
        credentials: { alias: '', password: '' },

        newChannelName: '', joinChannelPub: '',
        writeData     : '', writePath     : '',

        sharePubs     : [], sharePerms    : [],
        showChannel   : false, curChannel : null, storage: ''
    }),

    computed: mapState({
        profile : state => state.user.principal,
        channels: state => state.user.channels,
        contents: state => state.user.contents
    }),

    //! hack
    watch: { channels: function() { this.sharePerms.push('read'); } },

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
        register() { this.$store.dispatch(REGISTER, this.credentials); },
        login()    { this.$store.dispatch(LOGIN,    this.credentials); },

        logout()   { this.$store.dispatch(LOGOUT); },

        addChannel() {
            this.$store.dispatch(ADD_CHANNEL, this.newChannelName);
        },

        shareChannel(index) {
            this.$store.dispatch(SHARE_CHANNEL, {
                channelPub: this.channels  [index].pub,
                userPub   : this.sharePubs [index],
                perm      : this.sharePerms[index],
            });
        },

        joinChannel() {
            this.$store.dispatch(JOIN_CHANNEL, this.joinChannelPub);
        },

        writeChannel() {
            this.$store.dispatch(WRITE_CHANNEL, {
                pub: this.curChannel.pub,
                path: this.writePath, data: this.writeData
            });
        },

        reconnect() { this.$store.dispatch(RECONNECT); },

        openChannelModal(channel) {
            const pub = channel.pub;

            //! this probably isnt good enough to prevent double subscriptions
            if (!this.contents[pub]) {
                this.$store.dispatch(READ_CHANNEL, { pub: pub, path: '' });

            } this.curChannel = channel; this.showChannel = true;
        },

        clearStorage() {
            for (let name of [ 'user', 'group' ]) {
                const req = indexedDB.deleteDatabase(name);

                req.onerror   = () => console.warn(`error deleting ${ name }`);
                req.onsuccess = () => console.info(`deleted ${ name }`);
            }
        },

        copy(id) {
            document.querySelector(id).select();
            document.execCommand('copy');
        }
    }
};

</script>

<style scoped>
    .key   { overflow: hidden; text-overflow: ellipsis; max-width: 8ch; }
    .modal {
        position: fixed;

        left: 0;     top: 0;
        width: 100%; height: 100%;

        background: rgba(0, 0, 0, 0.4);
    }
    .modal > section {
        position: relative;
        width: 50%; margin: 10% auto;

        padding: 1em 2em 2em 2em;
        background: white;
    }
    th, td { text-align: left; padding-right: 1ch; }

    footer { position: fixed; bottom: 0; }
    h3 { display: inline-block; }
</style>
