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

    const server = GunPeer({ peers: [relay ] });

    const peers = { // create internal 'user' and 'group' nodes

        user : GunPeer({ useStorage: false }), // enable group to find WebRTC peers
        group: GunPeer({ useStorage: false })

    }; // route internal nodes

    const e1 = server.connectInstance(peers.user);
    const e2 = peers.user.connectInstance(server);

    peers.user._.opt.announce();
    e1.off(); e2.off();

    setTimeout(function() {


        const e3 = server.connectInstance(peers.group);
        const e4 = peers.group.connectInstance(server);
        console.info('sdfsdf');
        peers.group._.opt.announce();
        e3.off(); e4.off();
    }, 5000);



    /* const e5 = peers.group.connectInstance(peers.user);
    const e6 = peers.user.connectInstance(peers.group); */


    //peers.group._.opt.peers = peers.user._.opt.peers;

    //e1.off(); e2.off(); e3.off(); e4.off();

    console.info(server);
    console.info(peers);

    // join network by connecting user to relay via WebSocket

    /* peers.user.addPeer(relay); */ return peers;
}

/* function logRoutes() {
    peers.group.on('out', function(msg) { console.log('group -> user');  this.to.next(msg); });
    peers.user .on('out', function(msg) { console.log('user  -> group'); this.to.next(msg); });
} */

export default { join };
