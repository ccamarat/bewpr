import { Serializer } from './Serializer';
import { MESSAGE_TYPES, DEFAULT_TIMEOUT } from './enums';
import { MessageQueue } from './MessageQueue';

/**
 * The socket is the primary means a client communicates with a peer server.
 */
export class Socket {
  /**
     * Creates a socket instance.
     * @param id - this instance's id. Used to locate it when message is received.
     * @param target - the socket's communication target.
     * @param peerId - The id of the peer socket.
     * @param timeout - Max time to wait for an ack to any message.
     */
  constructor (id, target, peerId, timeout = DEFAULT_TIMEOUT) {
    this.messages = new MessageQueue();

    this.id = id;

    this.peerId = peerId;

    this.target = target;

    this.timeout = timeout;

    // For health monitoring - indicate the last time the peer checked in telling us it's alive
    this.lastPeerCheckin = 0;

    // Indicates whether the peer has started
    this.isStarted = false;

    // Disable the socket when its closed.
    this._isClosed = false;
  }

  /**
     * will send a message to the socket's peer
     * @param message - message to send
     * @param type - type of message to send. Defaults to "DATA"
     */
  send (message, type = MESSAGE_TYPES.DATA) {
    if (this._isClosed) {
      return Promise.reject(new Error('socket is closed.'));
    }
    if (type === MESSAGE_TYPES.START) {
      this.isStarted = true;
    }

    return new Promise((resolve, reject) => {
      // eslint-disable-next-line prefer-const
      let packet;
      const resolver = {
        resolve,
        reject,
        timerId: window.setTimeout(() => {
          this.messages.fail(packet.messageId, new Error('TIMEOUT'));
        }, this.timeout)
      };

      packet = {
        sourceId: this.id,
        targetId: this.peerId,
        messageId: this.messages.add(resolver),
        message,
        type
      };

      this._send(Serializer.serialize(packet));
    });
  }

  /**
     * Acknowledges a message.
     * @param messageId message ID to ack.
     */
  ack (messageId) {
    if (this._isClosed) {
      return;
    }

    const packet = {
      sourceId: this.id,
      targetId: this.peerId,
      messageId,
      message: '',
      type: MESSAGE_TYPES.ACK
    };

    this._send(Serializer.serialize(packet));
  }

  _send (message) {
    this.target.postMessage(message, '*');
  }

  /**
     * Closes the socket. Also triggers the "onClose" callback if supplied.
     */
  close () {
    if (!this._isClosed) {
      this.messages.clear();
      this.onClose();
      this._isClosed = true;
    }
  }

  /**
     * Handles a deserialized packet from a peer.
     * @param packet packet to handle
     */
  handle (packet) {
    if (this._isClosed) {
      return;
    }

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
