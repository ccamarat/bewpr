import { MESSAGE_TYPES } from '../src/enums';
import { Socket } from '../src/Socket';

describe('Socket', () => {
  let mockTarget;

  beforeEach(() => {
    jest.useFakeTimers();

    mockTarget = {
      postMessage: jest.fn()
    };
  });

  it('should send a message', () => {
    const subject = new Socket(1, mockTarget, 2);

    subject.send('this');

    expect(mockTarget.postMessage).toHaveBeenCalledWith(expect.any(String), '*');
    subject.close(); // Prevent errors when timeout from non-ack'd message is thrown
  });

  it('should call close if defined', () => {
    const subject = new Socket(1, mockTarget, 2);
    subject.onClose = jest.fn();

    subject.close();

    expect(subject.onClose).toHaveBeenCalled();
  });

  it('should call "onStart" if a start message is received', () => {
    const subject = new Socket(1, mockTarget, 2);
    subject.onStart = jest.fn();

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
    subject.onMessage = jest.fn();

    subject.handle({});

    expect(subject.onMessage).toHaveBeenCalled();
  });

  describe('timeouts', () => {
    it('should resolve the response promise when an ack is received', () => {
      expect.assertions(1);
      const subject = new Socket(1, mockTarget, 2);
      const p = subject.send('test');

      // Simulate a response.
      const messageId = Object.keys(subject.messages._items)[0];
      subject.handle({
        type: MESSAGE_TYPES.ACK,
        messageId
      });
      // Ensure any timeouts run
      jest.runAllTimers();

      return expect(p).resolves.toEqual(undefined);
    });

    it('should reject the response promise if no ack sent within default timeout if timeout is not specified', () => {
      expect.assertions(1);
      const subject = new Socket(1, mockTarget, 2);
      const p = subject.send('test');

      jest.advanceTimersByTime(5001);

      return expect(p).rejects.toThrow('TIMEOUT');
    });

    it('should reject the response promise if no ack sent within specified timeout', () => {
      expect.assertions(1);
      const subject = new Socket(1, mockTarget, 2, 3000);
      const p = subject.send('test');

      jest.advanceTimersByTime(3001);

      return expect(p).rejects.toThrow('TIMEOUT');
    });
  });
});
