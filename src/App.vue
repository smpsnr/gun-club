<template>
<main>

    <section>
        <h2> Login </h2>

        <form v-if="!principal">
            <input id="username" v-model="username" placeholder="Username"
                   type="text" autocomplete="username">

            <input id="password" v-model="password" placeholder="Password"
                   type="password" autocomplete="current-password">

            <input id="login" value="Login"
                   type="button" @click="login()">

            <input id="register" value="Register"
                   type="button" @click="register()">
        </form>

        <input v-else id="logout" value="Log out"
               type="button" @click="logout()">

    </section>

    <section v-if="principal">
        <h2> Profile </h2>

        <table>
            <tr> <b> Alias   </b> <td> {{ principal.alias }} </td> </tr>
            <tr> <b> Pub key </b> <td> {{ principal.pub   }} </td> </tr>
        </table>

        <h3> Channels </h3>

        <form>
            <input id="new-channel-name" placeholder="Channel name"
                   type="text" v-model="channelName">

            <input id="new-channel" value="Create channel"
                   type="button" @click="addChannel()">

        </form> <br>

        <table>
            <tr> <th> Name </th> <th> Permission </th> </tr>
            <tr v-for="(channel, index) in channels" :key="index">
                <td> {{ channel.name }} </td>
                <td> {{ channel.permission }} </td>
                <td>
                    <input id="share-channel-pub" placeholder="User pub"
                           type="text" v-model="sharePub">

                    <input id="share-channel" value="Share channel"
                           type="button" @click="shareChannel(channel.pub)">
                </td>
            </tr>

        </table>

    </section>

    <footer>
        <h2>
            Debug
            <input id="reconnect" value="Reconnect"
                   type="button" @click="reconnect()">

        </h2>
    </footer>

</main>
</template>

<script>
import { mapState } from 'vuex';

import { REGISTER, LOGIN, LOGOUT, ADD_CHANNEL, SHARE_CHANNEL, RECONNECT
} from 'store/actions/user';

export default {
    name: 'App',
    data: () => ({ username: '', password: '', channelName: '', sharePub: '' }),

    computed: mapState({
        channels : state => state.user.channels,
        principal: state => state.user.principal
    }),

    methods: {
        register() {
            const credentials = { alias: this.username, password: this.password };
            this.$store.dispatch(REGISTER, credentials);
        },

        login() {
            const credentials = { alias: this.username, password: this.password };
            this.$store.dispatch(LOGIN, credentials);
        },

        logout()     { this.$store.dispatch(LOGOUT); },

        addChannel() { this.$store.dispatch(ADD_CHANNEL, this.channelName); },

        shareChannel(channelPub) {
            const details = { channelPub: channelPub, userPub: this.sharePub };
            this.$store.dispatch(SHARE_CHANNEL, details);
        },

        reconnect()  { this.$store.dispatch(RECONNECT); }
    }
};

</script>

<style scoped>
    footer { position: fixed; bottom: 0; }
</style>
