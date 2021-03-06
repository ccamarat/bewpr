export const DEFAULT_HEALTH_CHECK_INTERVAL = 1000;
export const DEFAULT_TIMEOUT = 5000;

/**
 * Possible message types sent/recv'd by a socket
 * @type {{DATA: string, START: string, HEARTBEAT: string}}
 */
export const MESSAGE_TYPES = {
  DATA: 'data',
  START: 'start',
  ACK: 'ack',
  HEARTBEAT: 'heartbeat'
};

export const isIE = window.ActiveXObject || 'ActiveXObject' in window;
