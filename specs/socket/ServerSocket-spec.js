import {Socket} from '../../src/socket/Socket';

describe('Socket', () => {
    let mockTarget;
    beforeEach(()=> {
        mockTarget = {
            postMessage: jasmine.createSpy('postMessage')
        };
    });

    it('should create a socket!', () => {
        const subject = new Socket(1, mockTarget, 2);
        expect(subject).toBeDefined();
    });
});
