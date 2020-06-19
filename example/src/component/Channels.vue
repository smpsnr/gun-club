<template>
<div>

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
        <tr> <th> Name </th> <th> Perm </th> <th> Pub </th> </tr>
        <tr v-for="(channel, index) in channels" :key="channel.pub">

            <td> {{ channel.name }} </td>
            <td>
                <input :value="channel.perm" type="button"
                       @click="openChannelModal(channel)">
            </td>
            <td>
                <input :id="`channel-${ index }-pub`" :value="channel.pub"
                       type="text" readonly="true" class="key">

                <input value="Copy" type="button"
                       @click="copy(`#channel-${ index }-pub`)">
            </td>
        </tr>

    </table>

    <div v-if="showChannel" class="modal" @click="showChannel = false">
        <!-- channel modal -->

        <section @click="$event.stopPropagation()">
            <h2> #{{ curChannel.name }} </h2>

            <form v-if="curChannel.perm === 'admin'">
                <b> Share </b> <!-- channel share -->

                <input v-model="sharePub" placeholder="Pub"
                       type="text" class="key">

                <select v-model="sharePerm">
                    <option value="read">  read  </option>
                    <option value="write"> write </option>
                    <option value="admin"> admin </option>
                </select>

                <input value="Share" type="button"
                       @click="shareChannel()">
            </form>
            <form v-if="
                curChannel.perm === 'admin' || curChannel.perm === 'write'">
                <b> Write </b> <!-- channel write -->

                <input v-model="writePath" placeholder="Path"
                       type="text" class="key">

                <input v-model="writeData" placeholder="Data"
                       type="text" class="key">

                <input value="Write" type="button" @click="writeChannel()">
                <br> <br>
            </form>

            <table>
                <tr> <th> Key </th> <th> Value </th> </tr>
                <tr v-for="(val, key) in contents[curChannel.pub]" :key="key">

                    <td> {{ key }} </td>
                    <td> {{ val }} </td>
                </tr>
            </table>

        </section>
    </div>

</div>
</template>

<script>
import { mapState } from 'vuex';

import { ADD_CHANNEL, SHARE_CHANNEL, JOIN_CHANNEL, WRITE_CHANNEL, READ_CHANNEL
} from 'store/actions/user';

export default {
    name: 'Channels',

    data: () => ({
        newChannelName: '',    joinChannelPub: '',
        showChannel   : false, curChannel    : null,

        sharePub      : '',    sharePerm     : 'read',
        writeData     : '',    writePath     : '',
    }),

    computed: mapState({
        channels: state => state.user.channels,
        contents: state => state.user.contents
    }),

    methods: {
        addChannel() {
            this.$store.dispatch(ADD_CHANNEL, this.newChannelName);
        },

        shareChannel() {
            this.$store.dispatch(SHARE_CHANNEL, {
                channelPub: this.curChannel.pub,
                userPub   : this.sharePub,
                perm      : this.sharePerm,
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

        openChannelModal(channel) {
            const pub = channel.pub;

            //! this probably isnt good enough to prevent double subscriptions
            if (!this.contents[pub]) {
                this.$store.dispatch(READ_CHANNEL, { pub: pub, path: '' });

            } this.curChannel = channel; this.showChannel = true;
        },

        copy(id) {
            document.querySelector(id).select();
            document.execCommand('copy');
        }
    }
};
</script>
