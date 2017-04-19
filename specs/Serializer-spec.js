import {Serializer, ERRORS} from '../src/Serializer';

describe('Serializer', () => {
    let socket;
    beforeEach(() => {
        socket = {
            id: 1,
            peerId: 100
        };
    });

    describe('serialize', () => {
        it('should serialize a message to a transmittable format', () => {
            const msg = 'Hello world';
            expect(Serializer.serialize(socket.id, socket.peerId, msg, 'data')).toEqual(jasmine.any(String));
        });

        it('should serialize a message containing a number', () => {
            const msg = '12345654321';
            expect(Serializer.serialize(socket.id, socket.peerId, msg, 'data')).toEqual(jasmine.any(String));
        });

        it('should serialize a message containing an object', () => {
            const msg = {
                foo: 'bar'
            };
            expect(Serializer.serialize(socket.id, socket.peerId, msg, 'data')).toEqual(jasmine.any(String));
        });

        it('should throw an error if the object cannot be serialized', () => {
            expect(() => {
                Serializer.serialize(0, 0, undefined, 0);
            }).toThrow();
        });
    });

    describe('deserialize', () => {
        const msg = (v) => Serializer.serialize(0, 1, v, 2);

        it('should deserialize a string', () => {
            const {message} = Serializer.deserialize(msg('test'));
            expect(message).toEqual('test');
        });
        it('should deserialize a number', () => {
            const {message} = Serializer.deserialize(msg(42));
            expect(message).toEqual(42);
        });
        it('should deserialize an object', () => {
            const o = {
                foo: 'bar'
            };
            const {message} = Serializer.deserialize(msg(o));
            expect(message).toEqual(o);
        });
        it('should deserialize an array', () => {
            const o = [0, 1, 2, 3, '3'];
            const {message} = Serializer.deserialize(msg(o));
            expect(message).toEqual(o);
        });

        it('should return sourceSocketId, targetSocketId, and message type', () => {
            const {sourceId, targetId, type} = Serializer.deserialize(msg('test'));
            expect(sourceId).toBe(0);
            expect(targetId).toBe(1);
            expect(type).toBe(2);
        });
    });
});

