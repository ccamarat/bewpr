const makeId = () => Date.now() + Math.random();

export class MessageQueue {
  constructor () {
    this._items = {};
    this._handled = [];
    this._failed = [];
  }

  add (resolver) {
    const id = makeId();

    this._items[id] = resolver;

    return id;
  }

  acknowledge (id) {
    const item = this._items[id];

    if (item) {
      clearTimeout(item.timerId);
      item.resolve();
      delete this._items[id];
      this._handled.push(id);
    }
  }

  clear () {
    const ids = Object.keys(this._items);
    for (let ix = 0; ix < ids.length; ix++) {
      const id = ids[ix];
      clearTimeout(this._items[id].timerId);
      delete this._items[id];
    }
  }

  fail (id, error) {
    const item = this._items[id];

    if (item) {
      item.reject(error);
      delete this._items[id];
      this._failed.push(id);
    }
  }
}
