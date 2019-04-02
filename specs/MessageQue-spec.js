import { MessageQueue } from '../src/MessageQueue';

describe('MessageQueue', () => {
  it('should resolve messages that are acknowledged', () => {
    const queue = new MessageQueue();
    const resolver = {
      timerId: 10,
      resolve: jest.fn(),
      reject: jest.fn()
    };
    const id = queue.add(resolver);

    queue.acknowledge(id);

    expect(resolver.resolve).toHaveBeenCalled();
  });

  it('should reject messages that fail (for instance if they timeout)', () => {
    const queue = new MessageQueue();
    const resolver = {
      timerId: 10,
      resolve: jest.fn(),
      reject: jest.fn()
    };
    const id = queue.add(resolver);

    queue.fail(id, 'expected error message');

    expect(resolver.reject).toHaveBeenCalledWith('expected error message');
  });

  it('should not throw when ack\'ing failed messages', () => {
    const queue = new MessageQueue();
    const resolver = {
      timerId: 10,
      resolve: () => {},
      reject: () => {}
    };
    const id = queue.add(resolver);

    queue.fail(id, 'expected error message');

    expect(() => { queue.acknowledge(id); }).not.toThrow();
  });
});
