import { GunPeer } from 'api/gun-peer';

/**
 * Build a Gun network with the following topology:
 *
 * NodeJS |     1-to-1      | current browser |    1-to-n    | other browsers
 *  relay | <--WebSocket--> | user <--> group | <--WebRTC--> | peers
 */

const port  = process.env.PORT || 8765;
const relay = `${ location.protocol }//${ location.hostname }:${ port }/gun`;

function join() {
    const peers = { // create internal 'user' and 'group' nodes

        user : GunPeer(), // enable group to find WebRTC peers
        group: GunPeer({ useStorage: false, useRTC: true })

    }; // route internal nodes

    peers.group.connectInstance(peers.user); // connect user & group directly
    peers.user .connectInstance(peers.group);

    // join network by connecting user to relay via WebSocket

    peers.user.addPeer(relay); return peers;
}

/* function logRoutes() {
    peers.group.on('out', function(msg) { console.log('group -> user');  this.to.next(msg); });
    peers.user .on('out', function(msg) { console.log('user  -> group'); this.to.next(msg); });
} */

export default { join };
