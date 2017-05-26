var DEFAULT_HEALTH_CHECK_INTERVAL = 1000;
var DEFAULT_HEALTH_CHECK_TIMEOUT = 5000;
var DEFAULT_TIMEOUT = 5000;

/**
 * Possible message types sent/recv'd by a socket
 * @type {{DATA: string, START: string, HEARTBEAT: string}}
 */
var MESSAGE_TYPES = {
    DATA: 'data',
    START: 'start',
    ACK: 'ack',
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

var Serializer = {
    serialize: JSON.stringify,
    deserialize: JSON.parse
};

var makeId = function makeId() {
    return Date.now() + Math.random();
};

var MessageQueue = function () {
    function MessageQueue() {
        classCallCheck(this, MessageQueue);

        this._items = {};
    }

    createClass(MessageQueue, [{
        key: 'add',
        value: function add(resolver) {
            var id = makeId();

            this._items[id] = resolver;

            return id;
        }
    }, {
        key: 'acknowledge',
        value: function acknowledge(id) {
            clearTimeout(this._items[id].timerId);
            this._items[id].resolve();
            delete this._items[id];
        }
    }, {
        key: 'fail',
        value: function fail(id, error) {
            this._items[id].reject(error);
            delete this._items[id];
        }
    }]);
    return MessageQueue;
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

        this.messages = new MessageQueue();

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
            var _this = this;

            var type = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : MESSAGE_TYPES.DATA;

            if (type === MESSAGE_TYPES.START) {
                this.isStarted = true;
            }

            return new Promise(function (resolve, reject) {
                // eslint-disable-next-line prefer-const
                var packet = void 0;
                var resolver = {
                    resolve: resolve,
                    reject: reject,
                    timerId: window.setTimeout(function () {
                        _this.messages.fail(packet.messageId, new Error('TIMEOUT'));
                    }, DEFAULT_TIMEOUT)
                };

                packet = {
                    sourceId: _this.id,
                    targetId: _this.peerId,
                    messageId: _this.messages.add(resolver),
                    message: message,
                    type: type
                };

                _this.target.postMessage(Serializer.serialize(packet), '*');
            });
        }

        /**
         * Acknowledges a message.
         * @param messageId message ID to ack.
         */

    }, {
        key: 'ack',
        value: function ack(messageId) {
            var packet = {
                sourceId: this.id,
                targetId: this.peerId,
                messageId: messageId,
                message: '',
                type: MESSAGE_TYPES.ACK
            };

            this.target.postMessage(Serializer.serialize(packet), '*');
        }

        /**
         * Closes the socket. Also triggers the "onClose" callback if supplied.
         */

    }, {
        key: 'close',
        value: function close() {
            this.onClose();
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
                    this.onStart();
                    this.isStarted = true;
                    break;
                case MESSAGE_TYPES.ACK:
                    this.messages.acknowledge(packet.messageId);
                    break;
                case MESSAGE_TYPES.HEARTBEAT:
                    break;
                default:
                    this.onMessage(packet.message);
            }

            // Acknowledge all messages.
            if (packet.type !== MESSAGE_TYPES.ACK) {
                this.ack(packet.messageId);
            }
        }

        /**
         * Stub method; intended to be overridden by the consumer. This method is called when the socket is closed.
         */

    }, {
        key: 'onClose',
        value: function onClose() {}
        // Stub handler, intended to be overridden.


        /**
         * Stub method; intended to be overridden by the consumer. This method is called when the socket receives a message
         * from its peer.
         */

    }, {
        key: 'onMessage',
        value: function onMessage() {}
        // Stub handler, intended to be overridden.


        /**
         * Stub method; intended to be overridden by the consumer. This method is called when the socket receives the first
         * message from its peer, meaning the connection is officially active.
         */

    }, {
        key: 'onStart',
        value: function onStart() {
            // Stub handler, intended to be overridden.
        }
    }]);
    return Socket;
}();

var Host = function () {
    function Host() {
        classCallCheck(this, Host);

        this._sockets = [];
        // Listen for postMessage events
        window.addEventListener('message', this._onMessage.bind(this), false);

        // Create the health monitor
        this._healthMonitor = new HeartbeatMonitor(this, this._sockets);
    }

    createClass(Host, [{
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

            // ensure socket monitoring is active (it stops polling when all sockets are closed)
            this._healthMonitor.start();

            return new Promise(function (resolve, reject) {
                var timerId = setTimeout(function () {
                    socket.close();
                    reject(new Error('TIMEOUT'));
                }, DEFAULT_TIMEOUT);

                socket.onStart = function () {
                    clearTimeout(timerId);
                    resolve(socket);
                };
            });
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

/**
 * HeartbeatProvider; includes automatic heartbeat.
 */
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
        key: 'stop',
        value: function stop() {
            window.clearTimeout(this._timerId);
        }
    }, {
        key: '_sendHeartbeat',
        value: function _sendHeartbeat() {
            var _this = this;

            this._socket.send('', MESSAGE_TYPES.HEARTBEAT).catch(function () {
                return _this.onFail();
            });

            this._timerId = window.setTimeout(this._sendHeartbeat.bind(this), DEFAULT_HEALTH_CHECK_INTERVAL);
        }
    }, {
        key: 'onFail',
        value: function onFail() {
            // Stub handler, intended to be overridden.
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

            heartbeat.onFail = function () {
                heartbeat.stop();
                _this.close();
            };

            // Setup an event to notify the client that we're ready to send messages
            window.addEventListener('load', function () {
                heartbeat.start();
            }, false);
        }
    }, {
        key: '_onMessage',
        value: function _onMessage(message) {
            // On page reloads when the parent window is closed, postMessage sends to itself.
            if (message.source === window) {
                return;
            }
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
         * Closes the guest window!
         */

    }, {
        key: 'close',
        value: function close() {
            this.onClose();
            window.close();
        }

        /**
         * Lookup the Host's peer ID. Useful for debugging but not much else.
         * @returns {*}
         */

    }, {
        key: 'onClose',
        value: function onClose() {
            // Stub handler, intended to be overridden.
        }
    }, {
        key: 'id',
        get: function get$$1() {
            return this._socket.peerId;
        }
    }]);
    return Guest;
}();

export { Host, Guest };
//# sourceMappingURL=bewpr.mjs.map
