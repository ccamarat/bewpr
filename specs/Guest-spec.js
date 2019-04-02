import { Guest } from '../src/Guest';

describe('Guest', () => {
  let mockOpener;
  let realOpener;
  let mockAEL;
  let realAEL;
  let callbacks;

  beforeEach(() => {
    realOpener = window.opener;
    mockOpener = {
      postMessage: jest.fn()
    };
    window.opener = mockOpener;

    callbacks = {};
    mockAEL = (event, callback) => { callbacks[event] = callback; };
    realAEL = window.addEventListener;
    window.addEventListener = mockAEL;
  });
  afterEach(() => {
    window.opener = realOpener;
    window.addEventListener = realAEL;
  });

  it('should send "start" on load', () => {
    const subject = new Guest();
    subject.start();

    callbacks['load'] && callbacks['load']();

    expect(mockOpener.postMessage.mock.calls[0][0]).toMatch(/"type":"start"/);
  });
});
