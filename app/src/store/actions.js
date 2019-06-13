import Socket from '../lib/socket'

const Actions = {
  setUser(form) {
    return {
      type: 'SET_USER',
      payload: { username: form.username }
    }
  },

  joinRoom(room) {
    return {
      type: 'JOIN_ROOM',
      payload: room
    }
  },

  connect() {
    return (dispatch, getState) => {
      const state = getState()
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
  },

  login(user) {
    return (dispatch, getState) => {
      const { socket } = getState()
      const { channel } = socket
      channel.login(user)
      dispatch({ type: 'LOGIN_SENT', payload: user })
    }
  },

  join(room) {
    return (dispatch, getState) => {
      const { socket } = getState()
      const { channel } = socket
      channel.join(room)
      dispatch({ type: 'JOIN_SENT', payload: room })
    }
  },

  publish(message) {
    return (dispatch, getState) => {
      console.log("ACTIONS publish", message)
      const { socket } = getState()
      const { channel } = socket
      channel.publish(message)
      dispatch({ type: 'PUBLISH_SENT', payload: message })
    }
  },

}

export default Actions
