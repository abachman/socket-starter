/*
 * frontend-mqtt.js contains the connection initialization logic, but speaks MQTT protocol
 *
 * Clients connect to frontend and set up their session, frontend spends as
 * little time as possible doing authentication and message proxying.
 *
 * Restarting frontend.js will disconnect all clients that are connected to it,
 * therefore it should _never_ restart.
 *
*/
const WebSocket = require('ws'),
      WebSocketStream = require('websocket-stream'),
      EventEmitter = require('events');

const aedes = require('aedes')

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

const instance = new aedes.Server()

const mqtt_port = 2883
const ws_port   = 2884
const server = require('net').createServer(instance.handle)
const ws_server = WebSocketStream.createServer({ port: ws_port }, instance.handle)

instance.on('client', function (client) {
  log('[client] connected', client.id)
  clients.addConnection(client, client.id)
})

instance.on('clientDisconnected', function (client) {
  log('[clientDisconnected]', client.id)
  clients.removeConnection(client.id)
})

instance.on('clientError', function (client, err) {
  log('[clientError]', client.id, err)
  clients.removeConnection(client.id)
})

instance.on('keepaliveTimeout', function (client) {
  log('[keepaliveTimeout]', client.id)
  clients.removeConnection(client.id)
})

instance.on('publish', function (packet, client) {
  if (!client) {
    log('[publish] packet with no client', packet)
    return
  }

  log('[publish]', client.id, packet)
})

instance.on('subscribe', function (subscriptions, client) {
  log('[subscribe]', client.id, subscriptions)
})

instance.on('unsubscribe', function (unsubscriptions, client) {
  log('[unsubscribe]', client.id, unsubscriptions)
})

instance.authenticate = function (client, username, password, callback) {
  log('[authenticate]', client.id, { username, password })
  callback(null, true)
}

instance.authorizePublish = function (client, packet, callback) {
  log('[authorizePublish]', client.id, packet.topic)

  if (packet.topic === 'aaaa') {
    return callback(new Error('wrong topic'))
  }

  if (packet.topic === 'bbb') {
    packet.payload = new Buffer('overwrite packet payload')
  }

  callback(null)
}

instance.authorizeSubscribe = function (client, sub, callback) {
  log('[authorizeSubscribe]', client.id, sub)

  if (sub.topic === 'aaaa') {
    return callback(new Error('wrong topic'))
  }

  if (sub.topic === 'bbb') {
    // overwrites subscription
    sub.qos = sub.qos + 2
  }

  callback(null, sub)
}

// // start listening for connections
// const wss = new WebSocket.Server({ port: 8080 })
// wss.on('connection', function connection(ws) {
//   // this is where unique session IDs are created
//   const connectionID = shortid()
//
//   log("new connection", connectionID)
//   clients.addConnection(ws, connectionID)
//
//   ws.on('message', function incoming(message) {
//     log('client', connectionID, 'sent', typeof message, message);
//     backend.send(JSON.stringify({
//       id: connectionID,
//       count: count++,
//       payload: message
//     }))
//   });
//
//   ws.on('close', () => {
//     log('client', connectionID, 'has closed the connection')
//     clients.removeConnection(connectionID)
//
//     backend.send(JSON.stringify({
//       id: connectionID,
//       count: count++,
//       payload: { type: 'close' }
//     }))
//   })
//
//   ws.on('error', (err) => {
//     log('client', connectionID, 'error:', err)
//   })
// });

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

server.listen(mqtt_port, function () {
  console.log('mqtt server listening on port', mqtt_port)
})

console.log('websocket server listening on port', ws_port)
