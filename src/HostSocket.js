import {Socket} from './Socket';
import {isIE} from './enums';

export class HostSocket extends Socket {
    _send (message) {
        if (isIE) {
            this.target.toGuest(message);
        } else {
            super._send(message);
        }
    }
}
