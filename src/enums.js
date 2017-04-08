export const DEFAULT_HEALTH_CHECK_INTERVAL = 1000;
export const DEFAULT_HEALTH_CHECK_TIMEOUT = 5000;

export const MESSAGE_TYPES = {
    DATA: 'data',
    START: 'start',
    HEARTBEAT: 'heartbeat'
};

export const MODE = {
    STANDARDS: 0,               // Standards-Compliant, e.g. most modern browsers
    REQUIRES_PASSTHROUGH: 1,    // Requires a passthrough function (proxy call) e.g. IE9+
    REQUIRES_STACKBUST: 2       // Requires a deferred passthrough function (proxy call via setTimeout) e.g. IE8
};
