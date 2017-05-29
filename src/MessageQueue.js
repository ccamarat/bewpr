const makeId = () => Date.now() + Math.random();

export class MessageQueue {
    constructor() {
        this._items = {};
    }

    add(resolver) {
        const id = makeId();

        this._items[id] = resolver;

        return id;
    }

    acknowledge(id) {
        clearTimeout(this._items[id].timerId);
        this._items[id].resolve();
        delete this._items[id];
    }

    fail(id, error) {
        this._items[id].reject(error);
        delete this._items[id];
    }
}
