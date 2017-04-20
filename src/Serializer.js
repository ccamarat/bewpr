export class Serializer {

    /**
     * Turns a message into a packet containing information about the message's type and route.
     * @param sourceId - ID of socket sending the message
     * @param targetId - Target Socket ID sending the message
     * @param message - Message to send
     * @param type - Type of message
     */
    static serialize (sourceId, targetId, message, type) {
        const payload = JSON.stringify(message);

        if (!payload) {
            throw new Error(`cannot serialize '${message}'`);
        }

        const packet = {
            type,
            sourceId,
            targetId,
            payload
        };

        return JSON.stringify(packet);
    }

    /**
     *
     * @param message
     * @returns {{sourceId: *, targetId: (number|*), message: *, type: *}}
     */
    static deserialize (message) {
        const packet = JSON.parse(message);

        return {
            sourceId: packet.sourceId,
            targetId: packet.targetId,
            message: JSON.parse(packet.payload),
            type: packet.type
        };
    }
}
