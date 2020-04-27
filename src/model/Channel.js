import { Model } from '@vuex-orm/core';
import User      from 'model/User';

export default class Channel extends Model {
    static entity = 'channels'

    static fields() {
        return {
            id     : this.uid(),
            user_id: this.string(null).nullable(),

            name   : this.string(''),
            owner  : this.belongsTo(User, 'user_id')
        };
    }
}
