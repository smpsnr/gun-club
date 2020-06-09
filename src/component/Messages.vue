<template>
<div>

    <h3> Messages </h3>
    <form>
        <input v-model="newPub" placeholder="Pub" type="text">
        <input value="Search" type="button" @click="findUser()">
    </form>
    <form>
        <input v-model="newUser" type="text" readonly>
        <input value="New" type="button" @click="newMsg()" :disabled="newUser">
    </form> <br>

    <table>
        <tr> <th> User </th> <th> Message </th> <th> Pub </th> </tr>
        <tr v-for="(user, index) in users" :key="user.pub">

            <td> {{ user.alias }} </td>
            <td>
                <input value="Open" type="button" @click="openMsgModal(user)">
            </td>
            <td>
                <input :id="`user-${ index }-pub`" :value="user.pub"
                       type="text" readonly="true" class="key">

                <input value="Copy" type="button"
                       @click="copy(`#user-${ index }-pub`)">
            </td>
        </tr>

    </table>

</div>
</template>

<script>
export default {
    name: 'Messages',

    data: () => ({
        newPub: '', newUser: '',
        users: [{ alias: 'test', pub: 'xyz' }]
    }),

    methods: {
        findUser() {

        },

        newMsg() {

        },

        copy(id) {
            document.querySelector(id).select();
            document.execCommand('copy');
        }
    }
};
</script>
