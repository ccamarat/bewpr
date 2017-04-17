(function (exports) {
'use strict';

var DEFAULT_HEALTH_CHECK_INTERVAL = 1000;
var DEFAULT_HEALTH_CHECK_TIMEOUT = 5000;

/**
 * Possible message types sent/recv'd by a socket
 * @type {{DATA: string, START: string, HEARTBEAT: string}}
 */
var MESSAGE_TYPES = {
  DATA: 'data',
  START: 'start',
  HEARTBEAT: 'heartbeat'
};

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var HeartbeatMonitor = function () {
    function HeartbeatMonitor(host, sockets) {
        classCallCheck(this, HeartbeatMonitor);

        this._lasthealthPoll = Date.now();
        this._host = host;
        this._sockets = sockets;
        this._timerId = null;
    }

    /**
     * starts monitoring the sockets array (if it's not already doing so)
     */


    createClass(HeartbeatMonitor, [{
        key: 'start',
        value: function start() {
            if (!this._timerId) {
                this._monitor();
            }
        }
    }, {
        key: '_monitor',
        value: function _monitor() {
            var _this = this;

            // indicates whether any active sockets were found. Used to optionally stop monitoring.
            var hasActiveSockets = false;

            // loop through the socket array and make sure everyone's playing nice.
            this._sockets.forEach(function (socket) {
                if (!socket) {
                    return;
                }

                // Indicate that someone's alive
                hasActiveSockets = true;

                // Close any sockets who'se peers have disappeared into the ether.
                if (socket.isStarted && _this._lasthealthPoll - socket.lastPeerCheckin > DEFAULT_HEALTH_CHECK_TIMEOUT) {
                    _this._host.close(socket);
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

    }, {
        key: 'stop',
        value: function stop() {
            if (this._timerId) {
                window.clearTimeout(this._timerId);
                this._timerId = null;
            }
        }
    }]);
    return HeartbeatMonitor;
}();

var Serializer = function () {
    function Serializer() {
        classCallCheck(this, Serializer);
    }

    createClass(Serializer, null, [{
        key: "serialize",


        /**
         * Turns a message into a packet containing information about the message's type and route.
         * @param sourceId - ID of socket sending the message
         * @param targetId - Target Socket ID sending the message
         * @param message - Message to send
         * @param type - Type of message
         */
        value: function serialize(sourceId, targetId, message, type) {
            var payload = JSON.stringify(message);
            console.log(payload);
            if (!payload) {
                throw new Error("cannot serialize '" + message + "'");
            }

            var packet = {
                type: type,
                sourceId: sourceId,
                targetId: targetId,
                payload: payload
            };

            var s = JSON.stringify(packet);
            console.log(s);
            return s;
        }

        /**
         *
         * @param message
         * @returns {{sourceId: *, targetId: (number|*), message: *, type: *}}
         */

    }, {
        key: "deserialize",
        value: function deserialize(message) {
            var packet = JSON.parse(message);

            return {
                sourceId: packet.sourceId,
                targetId: packet.targetId,
                message: JSON.parse(packet.payload),
                type: packet.type
            };
        }
    }]);
    return Serializer;
}();

/**
 * The socket is the primary means a client communicates with a peer server.
 */
var Socket = function () {
    /**
     * Creates a socket instance.
     * @param id - this instance's id. Used to locate it when message is received.
     * @param target - the socket's communication target.
     * @param peerId - The id of the peer socket.
     */
    function Socket(id, target, peerId) {
        classCallCheck(this, Socket);

        this.id = id;

        this.peerId = peerId;

        this.target = target;

        // For health monitoring - indicate the last time the peer checked in telling us it's alive
        this.lastPeerCheckin = 0;

        // Indicates whether the peer has started
        this.isStarted = false;
    }

    /**
     * will send a message to the socket's peer
     * @param message - message to send
     * @param type - type of message to send. Defaults to "DATA"
     */


    createClass(Socket, [{
        key: 'send',
        value: function send(message) {
            var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : MESSAGE_TYPES.DATA;

            this.target.postMessage(Serializer.serialize(this.id, this.peerId, message, type), '*');
        }

        /**
         * Closes the socket. Also triggers the "onClose" callback if supplied.
         */

    }, {
        key: 'close',
        value: function close() {
            this.onClose && this.onClose();
        }

        /**
         * Handles a deserialized packet from a peer.
         * @param packet packet to handle
         */

    }, {
        key: 'handle',
        value: function handle(packet) {
            this.lastPeerCheckin = Date.now();

            switch (packet.type) {
                case MESSAGE_TYPES.START:
                    this.isStarted = true;
                    this.onStart && this.onStart();
                    break;
                case MESSAGE_TYPES.HEARTBEAT:
                    break;
                default:
                    this.onMessage && this.onMessage(packet.message);
            }
        }
    }]);
    return Socket;
}();

var Host = function () {
    function Host() {
        classCallCheck(this, Host);

        this._sockets = [];
    }

    /**
     * Signal that the host has been configured and is ready to start creating guests.
     */


    createClass(Host, [{
        key: 'start',
        value: function start() {
            // Listen for postMessage events
            window.addEventListener('message', this._onMessage.bind(this), false);

            // Create the health monitor
            this._healthMonitor = new HeartbeatMonitor(this, this._sockets);
        }
    }, {
        key: '_onMessage',
        value: function _onMessage(message) {
            var packet = Serializer.deserialize(message.data);
            var socket = this._sockets[packet.targetId];

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

    }, {
        key: 'create',
        value: function create(options) {
            // the socket id is simply the next available slot in the sockets array
            var socketId = this._sockets.length;

            // The 'endpoint' is the target window
            var endpoint = window.open(options.target, socketId.toString(), options.windowOptions);

            // new up a socket and store it in our socket's array
            var socket = new Socket(socketId, endpoint);

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

    }, {
        key: 'close',
        value: function close(socket) {
            if (socket.target) {
                socket.target.close();
            }
            socket.close();
            this._sockets[socket.id] = null;
        }

        /**
         * shuts down the host.
         */

    }, {
        key: 'shutdown',
        value: function shutdown() {
            for (var ix = 0; ix < this._sockets.length; ix++) {
                this.close(this._sockets[ix]);
            }
            this._sockets.length = 0;
        }
    }]);
    return Host;
}();

var HeartbeatProvider = function () {
    function HeartbeatProvider(socket) {
        classCallCheck(this, HeartbeatProvider);

        this._socket = socket;
    }

    /**
     * Signals that the socket is configured and can start reporting heartbeats.
     */


    createClass(HeartbeatProvider, [{
        key: 'start',
        value: function start() {
            this._socket.send('', MESSAGE_TYPES.START);
            this._sendHeartbeat();
        }
    }, {
        key: '_sendHeartbeat',
        value: function _sendHeartbeat() {
            this._socket.send('', MESSAGE_TYPES.HEARTBEAT);

            window.setTimeout(this._sendHeartbeat.bind(this), DEFAULT_HEALTH_CHECK_INTERVAL);
        }
    }]);
    return HeartbeatProvider;
}();

var DEFAULT_SERVER_SOCKET_ID = 0;

/**
 * The "Guest" is launched by the host. Typically hosts control guests, but guests can send messages to the host as
 * well.
 */
var Guest = function () {
    function Guest() {
        classCallCheck(this, Guest);
    }

    createClass(Guest, [{
        key: 'start',

        /**
         * Signals that the guest has been configured and is ready to send / receive messages
         */
        value: function start() {
            var _this = this;

            this._socket = new Socket(DEFAULT_SERVER_SOCKET_ID, window.opener || window.top, parseInt(window.name, 10));

            this._socket.onMessage = function () {
                _this.onReceiveMessage && _this.onReceiveMessage.apply(_this, arguments);
            };

            window.addEventListener('message', this._onMessage.bind(this), false);

            var heartbeat = new HeartbeatProvider(this._socket);

            // Setup an event to notify the client that we're ready to send messages
            window.addEventListener('load', function () {
                heartbeat.start();
            }, false);
        }
    }, {
        key: '_onMessage',
        value: function _onMessage(message) {
            var packet = Serializer.deserialize(message.data);

            this._socket.handle(packet);
        }

        /**
         * Sends a message to the host.
         * @param message
         */

    }, {
        key: 'sendMessage',
        value: function sendMessage(message) {
            this._socket.send(message);
        }

        /**
         * Lookup the Host's peer ID. Useful for debugging but not much else.
         * @returns {*}
         */

    }, {
        key: 'id',
        get: function get$$1() {
            return this._socket.peerId;
        }
    }]);
    return Guest;
}();

exports.Host = Host;
exports.Guest = Guest;

}((this.bewpr = this.bewpr || {})));
//# sourceMappingURL=bewpr.js.map
