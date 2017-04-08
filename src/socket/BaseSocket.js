import {Serializer} from '../util/Serializer';
import {MESSAGE_TYPES} from '../enums';

const SERVER_PEER_ID = 0;

// The socket is the primary means a client communicates with a peer server
export class BaseSocket {
    constructor(id, target, peerId = SERVER_PEER_ID) {
        this._serializer = Serializer;

        // The socket's id is used to locate it when a message is received
        this.id = id;

        // The id of the peer socket
        this.peerId = peerId;

        // The socket's communication target - either a window or an iframe - containing the peer socket listening for messages
        this.target = target;

        // For health monitoring - indicate the last time the peer checked in telling us it's alive
        this.lastPeerCheckin = 0;

        // Indicates whether the peer has started
        this.isStarted = false;
    }

    // Send will send a message to the socket's peer
    send(message, type = MESSAGE_TYPES.DATA) {
        this.target.postMessage(this._serializer.serialize(this, message, type), '*');
    }

    /**
     * Fires when the socket's peer server is operational. Corresponds to the peer window's 'window.onLoad' event
     */
    onStart() {
    }

    /**
     * fires when the peer socket sends a message to this socket
     */
    onMessage() {
    }

    /**
     * Fires when the socket's peer closes.
     */
    onClose() {
    }

    close (){
        this.onClose();
    }

    handle(request) {
        this.lastPeerCheckin = Date.now();

        switch (request.type) {
            case MESSAGE_TYPES.START:
                this.isStarted = true;
                this.onStart();
                break;
            case MESSAGE_TYPES.HEARTBEAT:
                break;
            default:
                this.onMessage(request.payload);
        }
    }
}
