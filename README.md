bewpr!
=======

### What is it?
This library creates a simple messaging channel between a "host" app and well-known "guest" apps.

This terminology is borrowed from the Virtual Machine world; it provides a useful analogy for describing host and guest
apps. A "guest" app is a web application, accessible at any url, that can be started by a host. The host starts the
guest by launching it in a new window and then communicates with it by sending messages back and forth. When the session
is finished, it can be closed on either end.

### Getting started
Install library in your project:
```
npm i -S bewpr
```

#### Create a Guest
```javascript
import {Guest} from 'bewpr';

const button = document.getElementById('some-button');
const log = document.getElementById('some-div');

// Create a new guest.
const guest = new Guest();

// Provide a way for users to send messages to the host.
button.addEventListener('click', function () {
    guest.sendMessage('Hello!');
});

// Do something when messages are received.
guest.onReceiveMessage = function (message) {
    log.innerHTML += message + '<br/>';
};

// Start the guest.
guest.start();

```

#### Create a Host
```javascript
import {Host} from 'bewpr';

const button = document.getElementById('some-button');
const log = document.getElementById('some-div');

// Create a host.
const host = new Host();

// Create a socket. This will open a new window.
const socket = host.create({
    // URL containing a guest instance.
    target: './guest.htm',
    // this is passed directly to window.open() and so the API is the same.
    windowOptions: 'left=0,top=0,height=900,width=800,status=yes,toolbar=no,menubar=no,location=yes'
});

// Configure the socket's onStart handler.
socket.onStart = function () {
    log.innerHTML += 'Socket ' + socket.id + ' is officially open.<br/>';
};
// Configure the socket's message received handler.
socket.onMessage = function (message) {
    oDiv.innerHTML += message + '<br/>';
};
// Configure the socket's onClose handler.
socket.onClose = function () {
    oDiv.innerHTML += 'Socket ' + socket.id + ' is closed.<br/>';
};

host.start();

```

### And that's about it.
See running example in [the test harness](./test-harness/host.htm).
