import {DEFAULT_HEALTH_CHECK_INTERVAL, MESSAGE_TYPES} from './enums';

/**
 * HeartbeatProvider; includes automatic heartbeat.
 */
export class HeartbeatProvider {
    constructor(socket) {
        this._socket = socket;
    }

    /**
     * Signals that the socket is configured and can start reporting heartbeats.
     */
    start() {
        this._socket.send('', MESSAGE_TYPES.START);
        this._sendHeartbeat();
    }

    stop () {
        window.clearTimeout(this._timerId);
    }

    _sendHeartbeat() {
        this._socket.send('', MESSAGE_TYPES.HEARTBEAT).catch(() => this.onFail());

        this._timerId = window.setTimeout(this._sendHeartbeat.bind(this), DEFAULT_HEALTH_CHECK_INTERVAL);
    }

    onFail() {
        // Stub handler, intended to be overridden.
    }
}
