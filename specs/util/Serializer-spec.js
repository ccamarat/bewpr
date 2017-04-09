import { Serializer, ERRORS } from '../../src/util/index';

describe('Serializer', () => {
    let socket;
    beforeEach(() => {
        socket = {
            id: 1,
            peerId: 100
        };
    });

    describe('serialize', () => {
        it('should serialize a message to a standard format', () => {
            const msg = 'Hello world';
            expect(Serializer.serialize(socket, msg, 'data')).toEqual('{"type":"data","sourceId":1,"targetId":100,"payload":"Hello world","length":11,"origin":"localhost"}');
        });

        it('should serialize a message containing a number', () => {
            const msg = '12345654321';
            expect(Serializer.serialize(socket, msg, 'data')).toEqual('{"type":"data","sourceId":1,"targetId":100,"payload":"12345654321","length":11,"origin":"localhost"}');
        });

        it('should serialize a message containing an object', () => {
            const msg = {
                foo: 'bar'
            };
            expect(Serializer.serialize(socket, msg, 'data')).toEqual('{"type":"data","sourceId":1,"targetId":100,"payload":"{\\"foo\\":\\"bar\\"}","length":13,"origin":"localhost"}');
        });
    });

    describe('deserialize', () => {
        it('should deserialize a message', () => {
            const obj = {
                payload: 'Hello World',
                length: 11
            };
            const msg = {
                data: JSON.stringify(obj)
            }
            expect(Serializer.deserialize(msg)).toEqual(jasmine.objectContaining(obj));
        });

        it('should throw an error if message length doesn\'t match', () => {
            const obj = {
                a: 'b',
                foo: 'bar'
            };
            const msg = {
                length: 10,
                data: JSON.stringify(obj)
            }
            expect(() => {
                Serializer.deserialize(msg);
            }).toThrow();
        });
    });
});
