import { HeartbeatMonitor } from './HeartbeatMonitor';
import { Serializer } from './Serializer';
import { HostSocket } from './HostSocket';
import { DEFAULT_TIMEOUT, isIE } from './enums';

const DEFAULT_GUEST_OPTIONS = {
  windowOptions: 'left=0,top=0,height=900,width=800,status=yes,toolbar=no,menubar=no,location=yes',
  timeout: DEFAULT_TIMEOUT
};

export class Host {
  constructor () {
    this._sockets = [];
    // Listen for postMessage events
    if (isIE) {
      window.fromGuest = this._onMessage.bind(this);
    } else {
      window.addEventListener('message', this._onMessage.bind(this), false);
    }

    // Create the health monitor
    this._healthMonitor = new HeartbeatMonitor(this, this._sockets);
  }

  _onMessage (message) {
    const packet = Serializer.deserialize(message.data);
    const socket = this._sockets[packet.targetId];

    // verify the socket reference
    if (!socket) {
      // probably what happened is the user refreshed the client page and the server's
      // still sending messages. Not much we can do but ignore it. The server should clean
      // itself up eventually.
      return;
    }

    socket.handle(packet);
  }

  /**
     * creates a guest session by opening a new window and passing that reference to a socket instance,
     * then returns the socket
     * @param options
     * @returns {Socket}
     */
  create (
    { target, windowOptions = DEFAULT_GUEST_OPTIONS.windowOptions, timeout = DEFAULT_GUEST_OPTIONS.timeout }
    = DEFAULT_GUEST_OPTIONS) {
    let pTarget = target;
    // the socket id is simply the next available slot in the sockets array
    const socketId = this._sockets.length;

    // The 'endpoint' is the target window
    if (isIE) {
      const proxy = './ie-proxy.html';

      pTarget = `${proxy}?guest=${pTarget}`;
    }
    const endpoint = window.open(pTarget, socketId.toString(), windowOptions);

    // new up a socket and store it in our socket's array
    const socket = new HostSocket(socketId, endpoint, undefined, timeout);

    this._sockets.push(socket);

    // ensure socket monitoring is active (it stops polling when all sockets are closed)
    this._healthMonitor.start();

    return new Promise((resolve, reject) => {
      const timerId = setTimeout(() => {
        this.close(socket);
        reject(new Error('TIMEOUT'));
      }, timeout);

      socket.onStart = () => {
        clearTimeout(timerId);
        resolve(socket);
      };
    });
  }

  /**
     * Close the socket, which renders it pretty much useless.
     * @param socket
     */
  close (socket) {
    if (socket.target) {
      socket.target.close();
    }
    socket.close();
    this._sockets[socket.id] = null;
  }

  /**
     * shuts down the host.
     */
  shutdown () {
    for (let ix = 0; ix < this._sockets.length; ix++) {
      this.close(this._sockets[ix]);
    }
    this._sockets.length = 0;
  }
}
