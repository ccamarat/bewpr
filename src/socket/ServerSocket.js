import {DEFAULT_HEALTH_CHECK_INTERVAL, MESSAGE_TYPES} from '../enums';
import {Socket} from './Socket';

const DEFAULT_SERVER_SOCKET_ID = 0;

/**
 * Server-side socket; includes automatic heartbeat.
 */
export class ServerSocket extends Socket {
    constructor () {
        super(DEFAULT_SERVER_SOCKET_ID, window.opener || window.top, parseInt(window.name, 10));
    }

    /**
     * Signals that the socket is configured and can start reporting heartbeats.
     */
    start () {
        this.send('', MESSAGE_TYPES.START);
        this._sendHeartbeat();
    }

    _sendHeartbeat () {
        this.send('', MESSAGE_TYPES.HEARTBEAT);

        window.setTimeout(this._sendHeartbeat.bind(this), DEFAULT_HEALTH_CHECK_INTERVAL);
    }
}
