<template>
<section @click="$event.stopPropagation()">

    <h2> #{{ channel.name }} </h2>

    <form v-if="channel.perm === 'admin'">
        <b> Invite </b> <!-- channel invite -->

        <input v-model="inviteURL" placeholder=""
                type="text" readonly="true" class="key">

        <select v-model="invitePerm">
            <option value="read">  read  </option>
            <option value="write"> write </option>
            <option value="admin"> admin </option>
        </select>

        <input value="Invite" type="button"
                @click="inviteChannel()">
    </form>

    <form v-if="channel.perm === 'admin'">
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
        channel.perm === 'admin' || channel.perm === 'write'">
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
        <tr v-for="(val, key) in content" :key="key">

            <td> {{ key }} </td>
            <td> {{ val }} </td>
        </tr>
    </table>

</section>
</template>

<script>
import { SHARE_CHANNEL, WRITE_CHANNEL
} from 'store/actions/user';

export default {
    name: 'ChannelModal',
    props: { channel: Object, content: Object },

    data: () => ({
        inviteURL: '', invitePerm: 'read',
        sharePub : '', sharePerm : 'read',
        writeData: '', writePath : ''
    }),

    methods: {
        inviteChannel() {
            this.inviteURL = 'dfg';
        },

        shareChannel() {
            this.$store.dispatch(SHARE_CHANNEL, {
                channelPub: this.channel.pub,
                userPub: this.sharePub, perm: this.sharePerm,
            });
        },

        writeChannel() {
            this.$store.dispatch(WRITE_CHANNEL, {
                pub: this.channel.pub,
                path: this.writePath, data: this.writeData
            });
        }
    }
};
</script>
