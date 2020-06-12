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

    const server = GunPeer({ peers: [ relay ] });

    const peers = { // create internal 'user' and 'group' nodes

        user : GunPeer({ useStorage: false }), // enable group to find WebRTC peers
        group: GunPeer({ useStorage: false })

    }; // route internal nodes

    function connectServerUser() {
        const e1 = server.    connectInstance(peers.user);
        const e2 = peers.user.connectInstance(server);

        peers.user._.opt.announce(); e1.off(); e2.off();
    }

    function connectServerGroup() {
        const e3 = server.connectInstance(peers.group);
        const e4 = peers.group.connectInstance(server);

        peers.group._.opt.announce(); e3.off(); e4.off();
    }

    connectServerUser();

    peers.user.on('hi', function(peer) {
        console.info('user internal'); this.to.next(peer);
        this.off(); connectServerGroup();
    });

    peers.group.on('hi', function(peer) {
        console.info('group internal'); this.to.next(peer);
        this.off(); //server.addPeer(relay);
    });

    console.info(server); console.info(peers); return peers;
}

/* function logRoutes() {
    peers.group.on('out', function(msg) { console.log('group -> user');  this.to.next(msg); });
    peers.user .on('out', function(msg) { console.log('user  -> group'); this.to.next(msg); });
} */

export default { join };
