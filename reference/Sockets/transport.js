// Defines a PostMessage Transport
(function (window) {
    'use strict';

    // --------------------------------------------------
    //               Configuration Items
    // --------------------------------------------------

    // The proxy helps the client send messages to the server in IE. Set to the location where this file lives.
    var PROXY = 'http://prototypes.prodemand.com/PostMessage/Sockets/proxy.htm',

    // Timeout specifies how long a server windo can go without checking in before it's peer socket is closed.
      TIMEOUT = 5000;

    // --------------------------------------------------
    //               Helpers
    // --------------------------------------------------

    // empty function pointer used to stub event handler hooks
    function noop() { }

    // browser-agnostic method of attaching an event handler
    function addEventListener(target, event, callback) {
        if (target.addEventListener) {
            target.addEventListener(event, callback, false);
        }
        else if (target.attachEvent) {
            event = 'on' + event;
            if (!target.attachEvent(event, callback)) {
                target[event] = callback;
            }
        }
        // else???
    }

    // --------------------------------------------------------------------- //
    // ------------   Socket           ------------------------------------- //
    // --------------------------------------------------------------------- //

    // turns a message into a packet containing information about the message's type and route
    function wrapMessage(socket, message, type) {
        // Message 'types':
        //   'message':      standard message
        //   'heartbeat':    indicates the server is alive
        var packet = {
            type: type || 'message',
            sourceId: socket._id,
            targetId: socket._peerId,
            payload: message,
            length: message.length,
            origin: window.document.domain
        };
        return JSON.stringify(packet);
    }

    // POSTMESSAGE_SUPPORT defines the levels of support for PostMessage
    var POSTMESSAGE_SUPPORT = {
        STANDARDS: 0,               // Standards-Compliant, e.g. most modern browsers
        REQUIRES_PASSTHROUGH: 1,    // Requires a passthrough function (proxy call) e.g. IE9+
        REQUIRES_STACKBUST: 2       // Requires a deferred passthrough function (proxy call via setTimeout) e.g. IE8
        // Browsers older than IE8 are unsupported
    },

    // 'Mode' defines the support mode this transport will operate in (default to standards; will override if needed)
      mode = POSTMESSAGE_SUPPORT.STANDARDS,

    // sendLookup specifies a set of operations that a socket can use to send a message to its peer depending on the transport mode
      sendLookup = [
        function (message, type) { // STANDARDS
            this._peer.postMessage(wrapMessage(this, message, type), '*');
        },
        function (message, type) { // REQUIRES_PASSTHROUGH
            this._peer.postMessagePassthrough(wrapMessage(this, message, type));
        },
        function (message, type) { // REQUIRES_STACKBUST
            this._peer.postMessagePassthroughStackbust(wrapMessage(this, message, type));
        }
    ],

    // The channel is a singleton object and is the only publically-visible member of the transport. Defined and exported below.
    _channel;

    // There doesn't appear to be a way to detect whether the browser's PostMessage implementation is broken, short of launching
    // a new window and testing its behavior. Since that's not practical we just hardcode support based on brute-force tests.
    (function () {
        var agent = window.navigator.userAgent,
          versionStartIx = agent && agent.indexOf('MSIE'),
          isIe = versionStartIx > -1,
          ieVersion;
        // Since we only support newer browsers and most newer browsers are standards-compliant,
        // assume that unless we're IE we're good
        if (!isIe) {
            return;
        }

        // Lookup IE info. IE8 requires stackbust. IE9 and 10 don't.
        agent = agent.substring(versionStartIx + 5);
        ieVersion = parseFloat(agent.substring(0, agent.indexOf(';')));

        mode = (ieVersion < 9) ? POSTMESSAGE_SUPPORT.REQUIRES_STACKBUST : POSTMESSAGE_SUPPORT.REQUIRES_PASSTHROUGH;
    } ());

    // The socket is the primary means a client communicates with a peer server
    function Socket(id, peer, peerId) {
        // The socket's id is used to locate it when a message is received
        this._id = id;
        // The socket's peer - either a window or an iframe - containing the peer socket listening for messages
        this._peer = peer;
        // The id of the peer socket
        this._peerId = peerId || 0; // assume we're targing a server
        // For health monitoring - indicate the last time the peer checked in telling us it's alive
        this.lastPeerCheckin = 0;
        // Indicates whether the peer has started
        this._started = false;
    }

    // Send will send a message to the socket's peer
    Socket.prototype.send = sendLookup[mode];

    // onStart fires when the socket's peer server is operational. Corresponds to the peer window's 'window.onLoad' event
    Socket.prototype.onStart = noop;

    // onMessage fires when the peer socket sends a message to this socket
    Socket.prototype.onMessage = noop;

    // onClose fires when the socket is closed. This happens when
    //  a. The client requests it
    //  b. The server times out (e.g. the peer's window is closed)
    Socket.prototype.onClose = noop;

    // --------------------------------------------------------------------- //
    // ------------   Channel          ------------------------------------- //
    // --------------------------------------------------------------------- //
    // The channel is the only publically-visible singleton object. It's used to create and destroy channels
    (function () {
        // Stores each active socket
        var _sockets = [],

        // pointer to the socket health monitor
        _healthMonitor;

        // Creates a server socket if needed. Server sockets are only needed by servers, not clients, so a null socket is created on clients
        function _createServer() {
            // Support new window servers or iFrame servers
            var parent = window.opener || window.top,
            // default client windows to null servers
            server = null;

            // If 'parent' is the same as the current window, then this is a client
            if (parent != window) { // don't compare type; gives false negatives in IE8
                // Create a new socket. The server's peer id is passed using the window.name property
                server = new Socket(0, parent, parseInt(window.name, 10));

                // Server sockets always support the standard postMessage event. The proxy ensures this.
                // Fix the server's send method accordingly.
                server.send = sendLookup[POSTMESSAGE_SUPPORT.STANDARDS];

                // Setup an event to notify the client that we're ready to send messages
                addEventListener(window, 'load', function () {
                    server.send('', 'start');

                    // Send out heartbeats once we start.
                    window.setInterval(function () {
                        server.send('', 'heartbeat');
                    }, 1000);
                });
            }
            return server;
        }

        // Handler routine for routing postMessage events
        function _onMessage(message, origin) {
            // TODO: Ensure message.origin matches

            // request object
            var req = JSON.parse(message.data),

            // lookup the socket
                socket = _sockets[req.targetId];

            // verify the socket reference
            if (!socket) {
                // probably what happened is the user refreshed the client page and the server's 
                // still sending messages. Not much we can do but ignore it. The server should clean
                // itself up eventually.
                return;
            }

            // handle the message            
            switch (req.type) {
                case 'start':
                    socket.lastPeerCheckin = Date.now();
                    socket._started = true;
                    socket.onStart();
                    break;
                case 'heartbeat':
                    socket.lastPeerCheckin = Date.now();
                    break;
                default:
                    socket.onMessage(req.payload);
            }
        }

        // tracks the health of sockets
        var SocketHealthMonitor = (function (_sockets) {
            // When was the last time we checked on our sockets?
            var _lasthealthPoll,

            // pointer to the intervalId
            _interval;

            // function to perform actual monitoring
            function monitor() {
                // socket reference
                var socket,
                // indicates whether any active sockets were found. Used to optionally stop monitoring.
                activeSockets = false;

                // loop through the socket array and make sure everyone's playing nice.
                for (var i = 1; i < _sockets.length; i++) {
                    socket = _sockets[i];
                    if (!socket) continue;

                    // Indicate that someone's alive
                    activeSockets = true;

                    // Close any sockets who'se peers have disappeared into the ether.
                    if (socket._started && (_lasthealthPoll - socket.lastPeerCheckin) > TIMEOUT) {
                        _channel.close(socket);
                    }
                }

                // Update
                _lasthealthPoll = Date.now();

                // If nobody's around, stop paying attention
                if (!activeSockets) {
                    stop();
                }
            }

            // Stops monitoring the sockets array.
            function stop() {
                if (_interval) {
                    window.clearInterval(_interval);
                    _interval = null;
                }
            }

            // constructor for health monitor
            function SocketHealthMonitor() {
                _lasthealthPoll = Date.now();
            }
            // starts monitoring the sockets array (if it's not already doing so)
            SocketHealthMonitor.prototype.start = function () {
                if (!_interval) {
                    _interval = window.setInterval(monitor, 1000);
                }
            };
            return SocketHealthMonitor;
        } (_sockets));

        // The 'Channel' is a singleton object that is responsible for configuring the transport
        function Channel() {
            // Setup a passthrough method for our proxy if needed
            if (mode !== POSTMESSAGE_SUPPORT.STANDARDS) {
                window.postMessagePassthrough = _onMessage;
            }

            // Listen for postMessage events
            addEventListener(window, 'message', _onMessage);

            // create the server and store off a reference
            _sockets.push(_createServer());

            // Create the health monitor
            _healthMonitor = new SocketHealthMonitor();
        }
        // creates a 'channel' by opening a new window or iFrame and passing that reference to a socket 
        // instance, then returns the socket
        Channel.prototype.create = function (options) {
            // The 'endpoint' is the target window
            var endpoint,
            // the socket id is simply the next available slot in the sockets array
                socketId = _sockets.length,
            // socket to be returned
                socket;
            // if returning a new window, open it
            if (options.newWindow) {
                // just open the window if we're in Standards mode
                if (mode === POSTMESSAGE_SUPPORT.STANDARDS) {
                    endpoint = window.open(options.target, socketId, options.windowOptions);
                }
                // If we're not in standards mode, create a proxy
                else {
                    endpoint = window.open(PROXY + '?server=' + options.target, socketId, options.windowOptions);
                }
            }
            // TBD
            else {
                throw 'iFrame is unsupported at this time';
            }
            // new up a socket and store it in our socket's array
            socket = new Socket(socketId, endpoint);
            _sockets.push(socket);

            // ensure socket monitoring is active
            _healthMonitor.start();

            // give the people what they ask for
            return socket;
        };
        // close the socket. Renders it pretty much useless.
        Channel.prototype.close = function (socket) {
            var endpoint = socket._peer;
            if (endpoint) {
                endpoint.close();
            }
            socket.onClose();
            _sockets[socket._id] = null;
        };
        // get the server socket. May return null if this is a client session
        Channel.prototype.getServer = function () {
            return _sockets[0];
        };
        // shuts down the transport.
        Channel.prototype.shutdown = function () {
            for (var i = 0; i < _sockets.length; i++) {
                this.close(_sockets[i]);
            }
            _sockets = [];
        };

        _channel = new Channel();
    } ());
    // Exports
    window.PMT = {
        Channel: _channel
    };
} (window));