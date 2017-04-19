import {MESSAGE_TYPES} from '../src/enums';
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
});
