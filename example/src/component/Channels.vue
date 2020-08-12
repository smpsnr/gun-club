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

    <div class="modal" v-if="showChannel" @click="showChannel = false">
        <ChannelModal
            :channel="curChannel" :content="contents[curChannel.pub]" />
    </div>

</div>
</template>

<script>
import { mapState } from 'vuex';

import { ADD_CHANNEL, JOIN_CHANNEL, READ_CHANNEL
} from 'store/actions/user';

import ChannelModal from 'component/ChannelModal.vue';

export default {
    name: 'Channels',
    components: { ChannelModal },

    data: () => ({
        newChannelName: '',    joinChannelPub: '',
        showChannel   : false, curChannel    : null
    }),

    computed: mapState({
        channels: state => state.user.channels,
        contents: state => state.user.contents
    }),

    methods: {
        addChannel() {
            this.$store.dispatch(ADD_CHANNEL, this.newChannelName);
        },

        joinChannel() {
            this.$store.dispatch(JOIN_CHANNEL, this.joinChannelPub);
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
