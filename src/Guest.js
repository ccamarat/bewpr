import {Serializer} from './util/index';
import {ServerSocket} from './socket/index';

/**
 * The "Guest" is launched by the host. Typically hosts control guests, but guests can send messages to the host as
 * well.
 */
export class Guest {
    constructor () {
        this._serializer = Serializer;
    }

    /**
     * Signals that the guest has been configured and is ready to send / receive messages
     */
    start () {
        this._server = new ServerSocket();

        this._server.onMessage = (...args) => {
            this.onReceiveMessage && this.onReceiveMessage(...args);
        };

        window.addEventListener('message', this._onMessage.bind(this), false);

        // Setup an event to notify the client that we're ready to send messages
        window.addEventListener('load', () => {
            this._server.start();
        }, false);
    }

    _onMessage (message) {
        const packet = this._serializer.deserialize(message);

        this._server.handle(packet);
    }

    /**
     * Sends a message to the host.
     * @param message
     */
    sendMessage (message) {
        this._server.send(message);
    }

    /**
     * Lookup the Host's peer ID. Useful for debugging but not much else.
     * @returns {*}
     */
    get id () {
        return this._server.peerId;
    }
}
