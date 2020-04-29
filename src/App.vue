<template>
<main>

    <section>
        <h2> Login </h2>

        <form v-if="!principal">
            <input v-model="credentials.alias" placeholder="Username"
                   type="text" autocomplete="username">

            <input v-model="credentials.password" placeholder="Password"
                   type="password" autocomplete="current-password">

            <input value="Login"    type="button" @click="login()">
            <input value="Register" type="button" @click="register()">
        </form>

        <input v-else value="Log out" type="button" @click="logout()">

    </section>

    <section v-if="principal">
        <h2> Profile </h2>

        <table>
            <tr> <b> Alias </b> <td> {{ principal.alias }} </td> </tr>
            <tr> <b> UUID  </b> <td> {{ principal.uuid }}  </td> </tr>
            <tr>
                <b> Pub key </b>
                <td>
                    <input id="principal-pub" :value="principal.pub"
                           type="text" readonly="true" class="key">

                    <input value="Copy" type="button"
                           @click="copy('#principal-pub')">
                </td>
            </tr>
        </table>

        <h3> Channels </h3>

        <form>
            <input v-model="newChannelName" placeholder="Name" type="text">
            <input value="Create channel" type="button" @click="addChannel()">
        </form>

        <form>
            <input v-model="joinChannelPub" placeholder="Pub" type="text">
            <input value="Join channel" type="button" @click="joinChannel()">
        </form> <br>

        <table>
            <tr>
                <th> Name </th> <th> Perm </th> <th> Pub </th> <th> Share </th>
            </tr>

            <tr v-for="(channel, index) in channels" :key="channel.pub">
                <td> {{ channel.name }}       </td>
                <td> {{ channel.permission }} </td>
                <td>
                    <input :id="`channel-${ index }-pub`" :value="channel.pub"
                           type="text" readonly="true" class="key">

                    <input value="Copy" type="button"
                           @click="copy(`#channel-${ index }-pub`)">
                </td>
                <td>
                    <input v-model="sharePubs[index]" placeholder="Pub" type="text">

                    <input value="Share" type="button"
                           @click="shareChannel(index)">
                </td>
            </tr>
        </table>

    </section>

    <footer>
        <h2>
            Debug
            <input value="Reconnect" type="button" @click="reconnect()">
        </h2>
    </footer>

</main>
</template>

<script>
import { mapState } from 'vuex';

import { REGISTER, LOGIN, LOGOUT, RECONNECT,
    ADD_CHANNEL, SHARE_CHANNEL, JOIN_CHANNEL
} from 'store/actions/user';

export default {
    name: 'App',

    data: () => ({
        credentials: { alias: '', password: '' },
        newChannelName: '', joinChannelPub: '', sharePubs: []
    }),

    computed: mapState({
        channels : state => state.user.channels,
        principal: state => state.user.principal
    }),

    methods: {
        register() { this.$store.dispatch(REGISTER, this.credentials); },
        login()    { this.$store.dispatch(LOGIN,    this.credentials); },

        logout()   { this.$store.dispatch(LOGOUT); },

        addChannel() {
            this.$store.dispatch(ADD_CHANNEL, this.newChannelName);
        },

        shareChannel(index) {
            this.$store.dispatch(SHARE_CHANNEL, {
                channelPub: this.channels[index].pub,
                userPub   : this.sharePubs[index]
            });
        },

        joinChannel() {
            this.$store.dispatch(JOIN_CHANNEL, this.joinChannelPub);
        },

        reconnect() { this.$store.dispatch(RECONNECT); },

        copy(id) {
            document.querySelector(id).select();
            document.execCommand('copy');
        }
    }
};

</script>

<style scoped>
    .key   { overflow: hidden; text-overflow: ellipsis; }
    th, td { text-align: left; padding-right: 1ch; }
    footer { position: fixed; bottom: 0; }
</style>
