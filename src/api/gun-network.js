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

        user : GunPeer({ peers: [relay] }), // enable group to find WebRTC peers
        group: GunPeer({  useRTC: true })

    }; // route internal nodes

    peers.group.on('out', function(req) {
        this.to.next(req);

        if (req.put || req.get) {
            peers.user.on('out', req);
        }
    });

    peers.user.on('in', function(req) {
        peers.group.on('in', req);
        this.to.next(req);
    });

 /*    peers.user.on('out', function(req) {
        if (req.headers && req.headers.group) {

            console.log('skipping double sea');
            delete req.headers.group; this.the.last.next(req);
        }
        else { this.to.next(req); }
    }); */

    /* peers.user.addPeer(relay); */ return peers;
}

/* function logRoutes() {
    peers.group.on('out', function(msg) { console.log('group -> user');  this.to.next(msg); });
    peers.user .on('out', function(msg) { console.log('user  -> group'); this.to.next(msg); });
} */

export default { join };
