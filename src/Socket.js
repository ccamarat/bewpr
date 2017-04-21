import {Serializer} from './Serializer';
import {MESSAGE_TYPES, DEFAULT_TIMEOUT} from './enums';

const makeId = () => Date.now() + Math.random();

class MessageQueue {
    constructor() {
        this._items = {};
    }

    add(resolver) {
        const id = makeId();

        this._items[id] = resolver;

        return id;
    }

    acknowledge(id) {
        clearTimeout(this._items[id].timerId);
        this._items[id].resolve();
        delete this._items[id];
    }

    fail(id) {
        this._items[id].reject();
        delete this._items[id];
    }
}

/**
 * The socket is the primary means a client communicates with a peer server.
 */
export class Socket {

    /**
     * Creates a socket instance.
     * @param id - this instance's id. Used to locate it when message is received.
     * @param target - the socket's communication target.
     * @param peerId - The id of the peer socket.
     */
    constructor(id, target, peerId) {
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
    send(message, type = MESSAGE_TYPES.DATA) {
        if (type === MESSAGE_TYPES.START) {
            this.isStarted = true;
        }

        return new Promise((resolve, reject) => {
            const resolver = {
                resolve,
                reject
            };

            resolver.messageId = this.messages.add(resolver);
            resolver.timerId = window.setTimeout(() => {
                reject(new Error('TIMEOUT'));
            }, DEFAULT_TIMEOUT);

            const packet = {
                sourceId: this.id,
                targetId: this.peerId,
                messageId: resolver.messageId,
                message,
                type
            };

            this.target.postMessage(Serializer.serialize(packet), '*');
        });
    }

    /**
     * Acknowledges a message.
     * @param messageId message ID to ack.
     */
    ack(messageId) {
        const packet = {
            sourceId: this.id,
            targetId: this.peerId,
            messageId,
            message: '',
            type: MESSAGE_TYPES.ACK
        };

        this.target.postMessage(Serializer.serialize(packet), '*');
    }

    /**
     * Closes the socket. Also triggers the "onClose" callback if supplied.
     */
    close() {
        this.onClose && this.onClose();
    }

    /**
     * Handles a deserialized packet from a peer.
     * @param packet packet to handle
     */
    handle(packet) {
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
    onClose () {
        // Stub handler, intended to be overridden.
    }

    /**
     * Stub method; intended to be overridden by the consumer. This method is called when the socket receives a message
     * from its peer.
     */
    onMessage () {
        // Stub handler, intended to be overridden.
    }

    /**
     * Stub method; intended to be overridden by the consumer. This method is called when the socket receives the first
     * message from its peer, meaning the connection is officially active.
     */
    onStart () {
        // Stub handler, intended to be overridden.
    }
}
