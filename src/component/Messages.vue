<template>
<div>

    <h3> Messages </h3>
    <form>
        <input v-model="newPub" placeholder="Pub" type="text">
        <input value="Search" type="button" @click="findUser()">
    </form>
    <form>
        <input v-model="newUser.alias" type="text" readonly>
        <input value="New" type="button"
               @click="openChat()" :disabled="!newUser.alias">
    </form> <br>

    <table>
        <tr> <th> User </th> <th> Message </th> <th> Pub </th> </tr>
        <tr v-for="(user, index) in chats" :key="user.pub">

            <td> {{ user.alias }} </td>
            <td>
                <input value="Open" type="button"
                       @click="openChatModal(user)">
            </td>
            <td>
                <input :id="`user-${ index }-pub`" :value="user.pub"
                       type="text" readonly="true" class="key">

                <input value="Copy" type="button"
                       @click="copy(`#user-${ index }-pub`)">
            </td>
        </tr>

    </table>

    <div v-if="showChat" class="modal" @click="showChat = false">
        <!-- channel modal -->

        <section @click="$event.stopPropagation()">
            <h2> #{{ curChat.alias }} </h2>

            <form>
                <b> Write </b> <!-- channel write -->

                <input v-model="writeData" placeholder="Data"
                       type="text" class="key">

                <input value="Write" type="button" @click="writeChat()">
                <br> <br>
            </form>

            <table>
                <tr> <th> Time </th> <th> Message </th> </tr>
                <tr v-for="(val, key) in messages[curChat.pub]" :key="key">

                    <td> {{ val.time }} </td>
                    <td> {{ val.msg }} </td>
                </tr>
            </table>

        </section>
    </div>

</div>
</template>

<script>
import { mapState } from 'vuex';

import { FIND_USER, START_CHAT, WRITE_CHAT, READ_CHAT
} from 'store/actions/user';

export default {
    name: 'Messages',

    data: () => ({
        newPub  : '',    newUser: {},
        showChat: false, curChat: null, writeData: ''
    }),

    computed: mapState({
        chats   : state => state.user.chats,
        messages: state => state.user.messages
    }),

    methods: {
        findUser() {
            this.newUser = {};
            this.$store.dispatch(FIND_USER, this.newPub)
                .then(user => this.newUser = user);
        },

        openChat() {
            this.$store.dispatch(START_CHAT, this.newUser);
        },

        writeChat() {
            this.$store.dispatch(WRITE_CHAT, {
                pub: this.curChat.pub,
                data: this.writeData
            });
        },

        openChatModal(user) {
            const pub = user.pub;
            this.$store.dispatch(READ_CHAT, pub);
            this.curChat = user; this.showChat = true;
        },

        copy(id) {
            document.querySelector(id).select();
            document.execCommand('copy');
        }
    }
};
</script>
