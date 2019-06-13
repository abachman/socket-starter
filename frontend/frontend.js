/*
 * frontend.js contains the connection initialization logic.
 *
 * Clients connect to frontend and set up their session, frontend spends as
 * little time as possible doing authentication and message proxying.
 *
 * Restarting frontend.js will disconnect all clients that are connected to it,
 * therefore it should _never_ restart.
 *
*/
const WebSocket = require('ws'),
      EventEmitter = require('events');

const wss = new WebSocket.Server({ port: 8080 });

function log(...msg) {
  console.log('[frontend]', ...msg)
}

function shortid() {
  return '_' + Math.random().toString(36).substr(2, 9);
}

class BackendConnection extends EventEmitter {
  constructor() {
    super()
    this._queue = []
    this._connected = false

    this.onClose   = this.onClose.bind(this)
    this.onOpen    = this.onOpen.bind(this)
    this.onMessage = this.onMessage.bind(this)
    this.onError   = this.onError.bind(this)

    this.connect()
  }

  clearEventListeners(conn) {
    conn.off('close', this.onClose)
    conn.off('open', this.onOpen)
    conn.off('message', this.onMessage)
    conn.off('error', this.onError)
  }

  addEventListeners(conn) {
    conn.on('close', this.onClose)
    conn.on('open', this.onOpen)
    conn.on('message', this.onMessage)
    conn.on('error', this.onError)
  }

  onClose() {
    log('connection to backend closed')
    this._connected = false
    setTimeout(() => this.connect(), 1000)
  }

  onOpen() {
    log('connected to backend')
    this._connected = true
    this.flush()
  }

  onMessage(data) {
    this.emit('message', data)
  }

  onError(err) {
    log('connection to backend error:', err)
  }

  connect() {
    if (this._connected) return

    if (this.conn) {
      this.clearEventListeners(this.conn)
    }

    log('start connection to backend')
    this.conn = new WebSocket('ws://localhost:8081/')
    this.addEventListeners(this.conn)
  }

  flush() {
    while (this._queue.length > 0) {
      const msg = this._queue.shift()
      this.send(msg)
    }
  }

  send(message) {
    if (this._connected) {
      log("push", message, "to backend")
      this.conn.send(message)
    } else {
      log("enqueue", message, "backend is down")
      this._queue.push(message)
      this.connect()
    }
  }
}

class SocketCollection {
  constructor() {
    this.connections = {}
  }

  log(...message) {
    console.log("[SocketCollection]", ...message)
  }

  error(...message) {
    console.error("[SocketCollection]", ...message)
  }

  addConnection(conn, id) {
    this.connections[id] = conn
  }

  removeConnection(id) {
    if (this.connections[id]) {
      this.connections[id].close(1008, 'disconnected from service')
    }
    this.log("[SocketCollection] removing connection", id)
    delete this.connections[id]
    this.log("[SocketCollection]", Object.keys(this.connections).length, "connections remain")
  }

  onMessage(message, callback) {
    this.log("fwd", typeof message, message)

    const data = JSON.parse(message)
    let removes = []
    let client

    if (data.id) {
      client = this.connections[data.id]
      if (client) {
        try {
          client.send(JSON.stringify(data))
        } catch (ex) {
          this.error("ERROR PUBLISHING", ex.message)
          this.removeConnection(data.id)
        }
      } else {
        this.error("no client found for message with ID", data.id)
        const err = {
          message: "no client found for message with ID: " + data.id,
          client_id: data.id
        }
        return callback(err)
      }
    } else {
      this.log("message has no .id")
      // internal use message, ignore here
    }

    callback(null)
  }
}

const backend = new BackendConnection()
const clients = new SocketCollection()
let count = 0

wss.on('connection', function connection(ws) {
  const connectionID = shortid()

  log("new connection", connectionID)
  clients.addConnection(ws, connectionID)

  ws.on('message', function incoming(message) {
    log('client', connectionID, 'sent', typeof message, message);
    backend.send(JSON.stringify({
      id: connectionID,
      count: count++,
      payload: message
    }))
  });

  ws.on('close', () => {
    log('client', connectionID, 'has closed the connection')
    clients.removeConnection(connectionID)

    backend.send(JSON.stringify({
      id: connectionID,
      count: count++,
      payload: { type: 'close' }
    }))
  })

  ws.on('error', (err) => {
    log('client', connectionID, 'error:', err)
  })
});

backend.on('message', function (message) {
  const data = JSON.parse(message)

  log('backend sent:', data)

  // message to frontend?

  if (data.type === 'internal') {
    // message coming directly from backend, act on it
    switch (data.action) {
      case 'disconnect':
        log("disconnecting client", data.id)
        clients.removeConnection(data.id)
        break;
      case 'block':
        log("blocking client", data.id)
        clients.removeConnection(data.id)
        break;
      default:
        log("doing internal action", data.action)
        break;
    }
  } else {
    // forward it
    clients.onMessage(message, (err) => {
      // can't forward, tell backend
      if (err) {
        backend.send(JSON.stringify({
          id: err.client_id,
          count: count++,
          payload: { type: 'close' }
        }))
      }
    })
  }
})

log('listening on 8080')
