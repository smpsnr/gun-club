import { Model } from '@vuex-orm/core';
import Channel   from 'model/Channel';

export default class User extends Model {
    static entity = 'users'

    static fields() {
        return {
            id      : this.uid(),
            name    : this.string(''),

            channels: this.hasMany(Channel, 'user_id')
        };
    }
}
