import {ServerSocket} from './socket/index';

/**
 * The "Guest" is launched by the host. Typically hosts control guests, but guests can send messages to the host as well.
 */
export class Guest {
    init() {
        this._server = new ServerSocket();

        // Setup an event to notify the client that we're ready to send messages
        window.addEventListener('load', () => {
            this._server.start();
        }, false);
    }
}
