import {HeartbeatMonitor} from './HeartbeatMonitor';
import {Serializer} from './Serializer';
import {Socket} from './Socket';

export class Host {
    constructor () {
        this._sockets = [];
    }

    /**
     * Signal that the host has been configured and is ready to start creating guests.
     */
    start () {
        // Listen for postMessage events
        window.addEventListener('message', this._onMessage.bind(this), false);

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
    create (options) {
        // the socket id is simply the next available slot in the sockets array
        const socketId = this._sockets.length;

        // The 'endpoint' is the target window
        const endpoint = window.open(options.target, socketId.toString(), options.windowOptions);

        // new up a socket and store it in our socket's array
        const socket = new Socket(socketId, endpoint);

        this._sockets.push(socket);

        // ensure socket monitoring is active
        this._healthMonitor.start();

        // give the people what they ask for
        return socket;
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
