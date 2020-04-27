<template>
<main>

    <form>
        <h1> Login </h1>

        <input id="username" v-model="username" placeholder="Username"
               type="text" autocomplete="username">

        <input id="password" v-model="password" placeholder="Password"
               type="password" autocomplete="current-password">

        <input id="login"    value="Login"    type="button" @click="login()">
        <input id="register" value="Register" type="button" @click="register()">

    </form>

    <div>
        <h1> Profile </h1>

        <input id="new-channel-name" placeholder="Channel name"
               type="text" v-model="channelName">

        <input id="new-channel" value="Create channel"
               type="button" @click="addChannel()">

        <input id="reconnect"   value="Reconnect"
               type="button" @click="reconnect()">

        <h4> Channels </h4>

        <table>
            <tr v-for="(channel, index) in channels" :key="index">
                <td> {{ channel }} </td>
            </tr>

        </table>

    </div>

</main>
</template>

<script>
import { mapState } from 'vuex';
import { REGISTER, LOGIN, ADD_CHANNEL, RECONNECT } from 'store/actions/user';

export default {
    name: 'App',
    data: () => ({username: '', password: '', channelName: '' }),

    computed: mapState({
        channels: state => state.user.channels
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

        addChannel() {
            this.$store.dispatch(ADD_CHANNEL, this.channelName);
        },

        reconnect() {
            this.$store.dispatch(RECONNECT);
        }
    }
};

</script>
