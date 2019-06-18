import mqtt from 'mqtt'
import EventEmitter from 'eventemitter3'

export default class MQTTClient extends EventEmitter {
  static messageTopic(room) {
    const prefix = `room/${room}`
    return prefix + '/messages'
  }

  static presenceTopic(room) {
    const prefix = `room/${room}`
    return prefix + '/presence'
  }

  constructor() {
    super()
    // Create WebSocket connection.
    console.log("[mqtt] start with env", process.env)
  }

  login(user, password) {
    console.log("[mqtt] login", user, password)
    this.user = user
    this.connect(password)
  }

  connect(password) {
    console.log('[mqtt] connecting...')

    this.client = mqtt.connect(process.env.REACT_APP_MQTT_URL, {
      username: this.user.username,
      password: password
    })

    this.client.on('connect', () => {
      console.log('[mqtt] connection open')
      this.emit('connected', this.user)
    })

    this.client.on('close', () => {
      console.log('[mqtt] connection to server lost!')
      this.emit('disconnected')
    })

    this.client.on('message', (topic, msgBytes) => {
      const mstr = msgBytes.toString()
      const recv = JSON.parse(mstr)

      const message = {
        sender: recv.u.username,
        content: recv.m
      }

      console.log('[mqtt] receiving: ', topic, message);
      this.emit('message', { topic, message })
    })
  }

  // cares about room + topics
  join(room) {
    this.room = room

    const topics = [
      MQTTClient.messageTopic(this.room),
      MQTTClient.presenceTopic(this.room)
    ]

    this.subscribe(topics)
  }

  subscribe(topics) {
    this.client.subscribe(topics, (err, granted) => {
      granted.forEach(({ topic }) => {
        this.emit('subscribed', topic)
      })
    })
  }

  publish(message) {
    const topic = MQTTClient.messageTopic(this.room)

    const obj = {
      u: this.user,
      m: message
    }

    this.send(topic, JSON.stringify(obj))
  }

  send(topic, message) {
    this.client.publish(topic, message)
  }
  // start() {
  //   this.socket = new WebSocket(process.env.REACT_APP_MQTT_URL)
  //   this.socket.addEventListener('open', () => {
  //     this.emit('connected')
  //   })

  //   this.socket.addEventListener('message', (event) => {
  //     console.log('[socket] receiving: ', event.data);
  //     const data = JSON.parse(event.data)
  //     this.emit('message', data)
  //   });

  //   this.socket.addEventListener('close', (evt) => {
  //     console.log('[socket] connection to server lost!')
  //     this.emit('disconnected')
  //   })

  //   this.socket.addEventListener('error', (err) => {
  //     console.log('[socket] error in server connection', err)
  //     this.emit('error', err)
  //   })
  // }

  // login(user) {
  //   this.user = user
  //   this.send({
  //     type: 'login',
  //     user: this.user
  //   })
  // }

  // join(room) {
  //   this.room = room
  //   this.send({ type: 'join', room: this.room })
  // }

  // publish(message) {
  //   this.send({
  //     user: this.user,
  //     room: this.room,
  //     message
  //   })
  // }

  // send(obj) {
  //   this.socket.send(JSON.stringify(obj))
  // }
}
