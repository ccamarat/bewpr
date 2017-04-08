import {DEFAULT_HEALTH_CHECK_INTERVAL, DEFAULT_HEALTH_CHECK_TIMEOUT} from '../enums';

// constructor for health monitor
export class SocketHealthMonitor {
    constructor(channel, sockets) {
        this._lasthealthPoll = Date.now();
        this._channel = channel;
        this._sockets = sockets;
        this._timerId = null;
    }

    // starts monitoring the sockets array (if it's not already doing so)
    start () {
        if (!this._timerId) {
            this._monitor();
        }
    }

    // function to perform actual monitoring
    _monitor() {
        // socket reference
        let socket;

        // indicates whether any active sockets were found. Used to optionally stop monitoring.
        let hasActiveSockets = false;

        // loop through the socket array and make sure everyone's playing nice.
        for (let i = 1; i < this._sockets.length; i++) {
            socket = this._sockets[i];
            if (!socket) {
                continue;
            }

            // Indicate that someone's alive
            hasActiveSockets = true;

            // Close any sockets who'se peers have disappeared into the ether.
            if (socket._started && (this._lasthealthPoll - socket.lastPeerCheckin) > DEFAULT_HEALTH_CHECK_TIMEOUT) {
                this._channel.close(socket);
            }
        }

        // Update
        this._lasthealthPoll = Date.now();

        // If nobody's around, stop paying attention
        if (!hasActiveSockets) {
            this.stop();
        }

        this._timerId = window.setTimeout(this._monitor, DEFAULT_HEALTH_CHECK_INTERVAL);
    }

    // Stops monitoring the sockets array.
    stop() {
        if (this._timerId) {
            window.clearTimeout(this._timerId);
            this._timerId = null;
        }
    }
}
