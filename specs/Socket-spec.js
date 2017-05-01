import {MESSAGE_TYPES, DEFAULT_TIMEOUT} from '../src/enums';
import {Socket} from '../src/Socket';

describe('Socket', () => {
    let mockTarget;

    beforeEach(()=> {
        mockTarget = {
            postMessage: jasmine.createSpy('postMessage')
        };
    });

    it('should send a message', () => {
        const subject = new Socket(1, mockTarget, 2);

        subject.send('this');

        expect(mockTarget.postMessage).toHaveBeenCalledWith(jasmine.any(String), '*');
    });

    it('should call close if defined', () => {
        const subject = new Socket(1, mockTarget, 2);
        subject.onClose = jasmine.createSpy('onClose');

        subject.close();

        expect(subject.onClose).toHaveBeenCalled();
    });

    it('should call "onStart" if a start message is received', () => {
        const subject = new Socket(1, mockTarget, 2);
        subject.onStart = jasmine.createSpy('onStart');

        subject.handle({
            type: MESSAGE_TYPES.START
        });

        expect(subject.onStart).toHaveBeenCalled();
    });

    it('should update lastPeerCheckin when a message is received', () => {
        const subject = new Socket(1, mockTarget, 2);

        subject.handle({
            type: MESSAGE_TYPES.HEARTBEAT
        });

        expect(subject.lastPeerCheckin).toBeNear(Date.now());
    });

    it('should call "onMessage" if any other message is received', () => {
        const subject = new Socket(1, mockTarget, 2);
        subject.onMessage = jasmine.createSpy('onMessage');

        subject.handle({});

        expect(subject.onMessage).toHaveBeenCalled();
    });

    describe('timeouts', () => {
        // Note: I'd prefer to use Jasmine's clock, but doing so interfers with native promises, somehow...
        let originalTimeout;
        beforeEach(function() {
            originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
            jasmine.DEFAULT_TIMEOUT_INTERVAL = DEFAULT_TIMEOUT * 2;
        });
        afterEach(function() {
            jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
        });

        it('should resolve the response promise on success', (done) => {
            const subject = new Socket(1, mockTarget, 2);
            const spy = jasmine.createSpy('spy');
            subject.send('test').then(spy);

            // Simulate a response.
            const messageId = Object.keys(subject.messages._items)[0];
            subject.handle({
                type: MESSAGE_TYPES.ACK,
                messageId
            });

            setTimeout(() => {
                expect(spy).toHaveBeenCalled();
                done();
            }, 10);
        });

        it('should reject the response promise on success', (done) => {
            const subject = new Socket(1, mockTarget, 2);
            const spy = jasmine.createSpy('spy');
            subject.send('test').catch(spy);

            setTimeout(() => {
                expect(spy).toHaveBeenCalled();
                done();
            }, DEFAULT_TIMEOUT + 100);
        });

    });
});
