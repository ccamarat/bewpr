import { DEFAULT_HEALTH_CHECK_INTERVAL } from './enums';

export class HeartbeatMonitor {
  constructor (host, sockets) {
    this._lasthealthPoll = Date.now();
    this._host = host;
    this._sockets = sockets;
    this._timerId = null;
  }

  /**
     * starts monitoring the sockets array (if it's not already doing so)
     */
  start () {
    if (!this._timerId) {
      this._monitor();
    }
  }

  _monitor () {
    // indicates whether any active sockets were found. Used to optionally stop monitoring.
    let hasActiveSockets = false;

    // loop through the socket array and make sure everyone's playing nice.
    this._sockets.forEach((socket) => {
      if (!socket) {
        return;
      }

      // Indicate that someone's alive
      hasActiveSockets = true;

      // Close any sockets who'se peers have disappeared into the ether.
      if (socket.isStarted && this._lasthealthPoll - socket.lastPeerCheckin > socket.timeout) {
        this._host.close(socket);
      }
    });

    // Update
    this._lasthealthPoll = Date.now();

    // If nobody's around, stop paying attention
    if (!hasActiveSockets) {
      this.stop();
    }

    this._timerId = window.setTimeout(this._monitor.bind(this), DEFAULT_HEALTH_CHECK_INTERVAL);
  }

  /**
     * Stops monitoring the sockets array.
     */
  stop () {
    if (this._timerId) {
      window.clearTimeout(this._timerId);
      this._timerId = null;
    }
  }
}
