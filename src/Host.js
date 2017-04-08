import {Serializer} from './util/index'
import {ClientSocket} from './socket/index';

export class Host {
    constructor() {
        this._sockets = [];
        this._serializer = Serializer;
    }

    init() {
        // Listen for postMessage events
        window.addEventListener('message', this._onMessage, false);

        // Create the health monitor
        this._healthMonitor = new SocketHealthMonitor(this._sockets);
    }

    _onMessage(message) {
        const packet = this._serializer.deserialize(message);
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
     * creates a 'channel' by opening a new window or iFrame and passing that reference to a socket instance,
     * then returns the socket
     * @param options
     * @returns {BaseSocket}
     */
    create(options) {
        // The 'endpoint' is the target window
        let endpoint;

        // the socket id is simply the next available slot in the sockets array
        const socketId = this._sockets.length;

        // socket to be returned
        let socket;

        // open a new window
        endpoint = window.open(options.target, socketId.toString(), options.windowOptions);

        // new up a socket and store it in our socket's array
        socket = new ClientSocket(socketId, endpoint);
        this._sockets.push(socket);

        // ensure socket monitoring is active
        this._healthMonitor.start();

        // give the people what they ask for
        return socket;
    }

    // close the socket. Renders it pretty much useless.
    close(socket) {
        if (socket.target) {
            socket.target.close();
        }
        socket.close();
        this._sockets[socket._id] = null;
    }

    // shuts down the host.
    shutdown() {
        for (let socket of this._sockets) {
            this.close(socket);
        }
        this._sockets.length = 0;
    }
}
