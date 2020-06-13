import { GunPeer, Gun } from 'api/gun-peer';

/**
 * Add a new RTCPeerConnection for local routing
 * @param { String } name
 */
Gun.prototype.createLocalPeer = function(name) {
    const opt = this._.opt; const mesh = opt.mesh;
    const peer = new RTCPeerConnection();

    const sendChannel = peer.createDataChannel(
        'dc', { ordered: false, maxRetransmits: 2 });

    peer['id']   = name;
    peer['wire'] = sendChannel;

    sendChannel.onclose = () => mesh.bye(peer);
    sendChannel.onopen  = () => mesh.hi (peer);

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

/**
 * Wire two Gun instances via local RTCPeerConnections
 *
 * @param { import('types').GunRef } gunOne
 * @param { import('types').GunRef } gunTwo
 */
function connectLocal(gunOne, gunTwo) {

    const peerOne = gunOne.createLocalPeer(gunTwo._.opt.name);
    const peerTwo = gunTwo.createLocalPeer(gunOne._.opt.name);

    peerOne.onicecandidate = event => !event.candidate
        || peerTwo.addIceCandidate(event.candidate).catch(console.error);

    peerTwo.onicecandidate = event => !event.candidate
        || peerOne.addIceCandidate(event.candidate).catch(console.error);

    peerOne.createOffer()
        .then(offer => peerOne.setLocalDescription(offer))

        .then(() => peerTwo.setRemoteDescription(peerOne.localDescription))
        .then(() => peerTwo.createAnswer())

        .then(answer => peerTwo.setLocalDescription(answer))
        .then(() => peerOne.setRemoteDescription(peerTwo.localDescription))

        .catch(console.error);
}

/**
 * Create two non-persistent Gun nodes for user & channel authentication
 * and one persistent "router" node.
 *
 * Connect user & channel to router via local RTCPeerConnections; connect
 * router to relay via Gun WebSocket & enable peering via WebRTC.
 *
 * group ⭨      ⭧ WebSocket relay peer ⭨
 *      ⮀ router ⮀                    ⮀ gun network
 *  user ⭩      ⭦ WebRTC browser peers ⭩
 *
 * @param { String } relay - URL of relay peer
 */
function join(relay) {

    const peers = {
        user  : GunPeer({ name: 'user',  useStorage: false }),
        group : GunPeer({ name: 'group', useStorage: false }),

        router: GunPeer({ name: 'router', peers: [ relay ], useRTC: true })
    };

    connectLocal(peers.router, peers.user);
    connectLocal(peers.router, peers.group);

    return peers;
}

export default { join };
