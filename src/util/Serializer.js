export class Serializer {
    // Turns a message into a packet containing information about the message's type and route
    static serialize(socket, message, type) {
        return JSON.stringify({
            type: type,
            sourceId: socket.id,
            targetId: socket.peerId,
            payload: message,
            length: message.length,
            origin: window.document.domain
        });
    }

    static deserialize(message) {
        return JSON.parse(message.data);
    }
}
