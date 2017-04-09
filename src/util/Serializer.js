export class Serializer {

    /**
     * Turns a message into a packet containing information about the message's type and route.
     * @param socket - Socket sending the message
     * @param payload - Message to send
     * @param type - Type of message
     */
    static serialize (socket, payload, type) {
        payload = typeof payload === 'object' ? JSON.stringify(payload) : payload;

        return JSON.stringify({
            type,
            sourceId: socket.id,
            targetId: socket.peerId,
            payload,
            length: payload.length,
            origin: window.document.domain
        });
    }

    /**
     * Deserializes a received message.
     * @param message
     */
    static deserialize (message) {
         message = JSON.parse(message.data);

         if (message.payload.length !== message.length) {
             throw new ERRORS.MESSAGE_VALIDATION_FAILED(message.length, message.payload.length);
         }

         try {
            message.payload = JSON.parse(message.payload);
         } catch (e) {
             // If the original payload was a
         }

         return message;
    }
}

export const ERRORS = {
    MESSAGE_VALIDATION_FAILED: class {
        constructor (expected, actual) {
            this.message = `Received message length is ${actual}; expected ${expected}.`
        }
        static get code () { return 0x0001; }
        toString () { return this.message; }
    }
}