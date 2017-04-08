import {MESSAGE_TYPES, DEFAULT_HEALTH_CHECK_INTERVAL} from '../enums';
import {BaseSocket} from './BaseSocket';

export class ServerSocket extends BaseSocket {
    constructor() {
        super(0, window.opener || window.top, parseInt(window.name, 10));
    }

    start () {
        this.send('', MESSAGE_TYPES.START);

        window.setTimeout(this._sendHeartbeat, DEFAULT_HEALTH_CHECK_INTERVAL);
    }

    _sendHeartbeat(){
        this.send('', MESSAGE_TYPES.HEARTBEAT);

        window.setTimeout(this._sendHeartbeat, DEFAULT_HEALTH_CHECK_INTERVAL);
    }
}
