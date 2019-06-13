import EventEmitter from 'eventemitter3'

export default class Socket extends EventEmitter {
  constructor() {
    super()

    // Create WebSocket connection.
    console.log("start socket with env", process.env)

    this.start()
  }

  start() {
    this.socket = new WebSocket(process.env.REACT_APP_WS_URL)

    this.socket.addEventListener('open', () => {
      this.emit('connected')
    })

    this.socket.addEventListener('message', (event) => {
      console.log('[socket] receiving: ', event.data);
      const data = JSON.parse(event.data)
      this.emit('message', data)
    });

    this.socket.addEventListener('close', (evt) => {
      console.log('[socket] connection to server lost!')
      this.emit('disconnected')
    })

    this.socket.addEventListener('error', (err) => {
      console.log('[socket] error in server connection', err)
      this.emit('error', err)
    })
  }

  login(user) {
    this.user = user
    this.send({
      type: 'login',
      user: this.user
    })
  }

  join(room) {
    this.room = room
    this.send({ type: 'join', room: this.room })
  }

  publish(message) {
    this.send({
      user: this.user,
      room: this.room,
      message
    })
  }

  send(obj) {
    this.socket.send(JSON.stringify(obj))
  }
}
