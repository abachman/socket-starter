import Socket from '../lib/socket'
import MQTTClient from '../lib/mqtt'

function connectToWebsocket(dispatch, state) {
  if (state.socket.connected && state.socket.channel) {
    return
  }

  const socket = new Socket()

  socket.on('connected', () => {
    dispatch({ type: 'CONNECTION_OPEN', payload: socket })
  })

  socket.on('disconnected', () => {
    dispatch({ type: 'CONNECTION_CLOSED' })
  })

  socket.on('message', (data) => {
    // data types can be: login, message, close, error, join
    if (data.type === 'login') {
      dispatch({ type: 'SET_USER', payload: data.user })
    }

    // translate messages from backend format to client format
    const out = { }

    if (data.user) {
      out.sender = data.user.username
    } else {
      out.sender = "$SYS"
    }

    switch(data.type) {
      case 'message':
        out.type = 'message'
        out.content = data.message
        break
      case 'login':
        out.type = 'system'
        out.content = 'has signed in'
        break
      case 'join':
        out.type = 'system'
        out.content = `has joined the room`
        break
      default:
        out.type = 'system'
        out.content = JSON.stringify(data)
        break
    }

    dispatch({ type: 'MESSAGE_RECEIVED', payload: out })
  })
}

// connect to the MQTT broker frontend
function connectToMqtt(dispatch, state) {

  console.group('connectToMqtt')
  if (state.mqtt.connected && state.mqtt.channel) {
    return
  }

  console.log('create client instance')
  const mqtt = new MQTTClient()

  mqtt.on('connected', (user) => {
    dispatch({ type: 'SET_USER', payload: user })
    dispatch({ type: 'MQTT_CONNECTION_OPEN' })
  })

  mqtt.on('disconnected', () => {
    dispatch({ type: 'MQTT_CONNECTION_CLOSED' })
  })

  mqtt.on('message', ({ topic, message }) => {
    dispatch({ type: 'MQTT_MESSAGE_RECEIVED', payload: { topic, message } })
  })

  mqtt.on('subscribed', topic => {
    dispatch({ type: 'MQTT_SUBSCRIBED', payload: { topic } })
  })

  dispatch({ type: 'MQTT_READY', payload: mqtt })

  console.groupEnd()
}

const Actions = {
  connect() {
    return (dispatch, getState) => {
      const state = getState()

      // connectToWebsocket(dispatch, state)
      connectToMqtt(dispatch, state)
    }
  },

  login(user) {
    if (!('username' in user)) {
      console.error('expected user to have .username')
    }

    return (dispatch, getState) => {
      const { socket, mqtt } = getState()

      // socket.channel.login(user)
      mqtt.channel.login(user, 'password')

      dispatch({ type: 'LOGIN_SENT', payload: user })
    }
  },

  join(room) {
    return (dispatch, getState) => {
      const { socket, mqtt } = getState()

      // socket.channel.join(room)
      mqtt.channel.join(room)
    }
  },

  leave(room) {
    return (dispatch, getState) => {
      const { socket, mqtt } = getState()

      // socket.channel.leave(room)
      mqtt.channel.leave(room)
    }
  },

  publish(message) {
    return (dispatch, getState) => {
      const { socket, mqtt } = getState()

      // socket.channel.publish(message)
      mqtt.channel.publish(message)

      dispatch({ type: 'PUBLISH_SENT', payload: message })
    }
  },

}

export default Actions
