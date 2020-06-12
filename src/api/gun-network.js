import { GunPeer, Gun } from 'api/gun-peer';

const port = process.env.PORT || 8765;
const url  = `${ location.protocol }//${ location.hostname }:${ port }/gun`;

Gun.prototype.addRTCPeer = function(name) {
    const opt = this._.opt; const mesh = opt.mesh;
    const peer = new RTCPeerConnection();

    const sendChannel = peer.createDataChannel('dc', { ordered: false, maxRetransmits: 2 });

    peer['id']   = name;
    peer['wire'] = sendChannel;

    sendChannel.onclose =  () => mesh.bye(peer);
    sendChannel.onopen  =  () => mesh.hi(peer);

    sendChannel.onmessage = (msg) => {
        if (msg) { mesh.hear(msg.data || msg, peer); }
    };

    peer.ondatachannel = event => {
        const receiveChannel = event.channel;

        receiveChannel.onmessage = sendChannel.onmessage;
        receiveChannel.onopen    = sendChannel.onopen;
        receiveChannel.onclose   = sendChannel.onclose;

    }; return peer;
};

function connectLocal(gunOne, gunTwo) {

    const peerOne = gunOne.addRTCPeer(gunTwo._.opt.name);
    const peerTwo = gunTwo.addRTCPeer(gunOne._.opt.name);

    peerOne.onicecandidate = e => !e.candidate
        || peerTwo.addIceCandidate(e.candidate).catch(console.error);

    peerTwo.onicecandidate = e => !e.candidate
        || peerOne.addIceCandidate(e.candidate).catch(console.error);

    peerOne.createOffer()
        .then(offer => peerOne.setLocalDescription(offer))
        .then(() => peerTwo.setRemoteDescription(peerOne.localDescription))
        .then(() => peerTwo.createAnswer())

        .then(answer => peerTwo.setLocalDescription(answer))
        .then(() => peerOne.setRemoteDescription(peerTwo.localDescription))
        .catch(console.error);
}

/**
 * Build a Gun network with the following topology:
 *
 * NodeJS |     1-to-1      | current browser |    1-to-n    | other browsers
 *  relay | <--WebSocket--> | user <--> group | <--WebRTC--> | peers
 */

function join() {

    const peers = { // create internal 'user' and 'group' nodes
        user : GunPeer({ name: 'user',  useStorage: false }),
        group: GunPeer({ name: 'group', useStorage: false }),

        relay: GunPeer({ name: 'relay', peers: [ url ], useRTC: true })
    };

    connectLocal(peers.relay, peers.user);
    connectLocal(peers.relay, peers.group);

    console.info('relay', peers.relay);
    console.info(peers); return peers;
}

export default { join };
