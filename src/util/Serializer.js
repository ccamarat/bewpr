export class Serializer {

    /**
     * Turns a message into a packet containing information about the message's type and route.
     * @param socket - Socket sending the message
     * @param message - Message to send
     * @param type - Type of message
     */
    static serialize (socket, message, type) {
        return JSON.stringify({
            type,
            sourceId: socket.id,
            targetId: socket.peerId,
            payload: message,
            length: message.length,
            origin: window.document.domain
        });
    }

    /**
     * Deserializes a received message.
     * @param message
     */
    static deserialize (message) {
        return JSON.parse(message.data);
    }
}
