import {Serializer} from '../util/index';
import {MESSAGE_TYPES} from '../enums';

/**
 * The socket is the primary means a client communicates with a peer server.
 */
export class Socket {

    /**
     * Creates a socket instance.
     * @param id - this instance's id. Used to locate it when message is received.
     * @param target - the socket's communication target.
     * @param peerId - The id of the peer socket.
     */
    constructor (id, target, peerId) {
        this._serializer = Serializer;

        this.id = id;

        this.peerId = peerId;

        this.target = target;

        // For health monitoring - indicate the last time the peer checked in telling us it's alive
        this.lastPeerCheckin = 0;

        // Indicates whether the peer has started
        this.isStarted = false;
    }

    /**
     * will send a message to the socket's peer
     * @param message - message to send
     * @param type - type of message to send. Defaults to "DATA"
     */
    send (message, type = MESSAGE_TYPES.DATA) {
        this.target.postMessage(this._serializer.serialize(this, message, type), '*');
    }

    /**
     * Closes the socket. Also triggers the "onClose" callback if supplied.
     */
    close () {
        this.onClose && this.onClose();
    }

    /**
     * Handles a message from a peer.
     * @param message message to handle
     */
    handle (message) {
        this.lastPeerCheckin = Date.now();

        switch (message.type) {
            case MESSAGE_TYPES.START:
                this.isStarted = true;
                this.onStart && this.onStart();
                break;
            case MESSAGE_TYPES.HEARTBEAT:
                break;
            default:
                this.onMessage && this.onMessage(message.payload);
        }
    }
}
