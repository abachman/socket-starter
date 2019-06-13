import { combineReducers } from 'redux'

function user(state = {}, action) {
  switch (action.type) {
    case 'SET_USER':
      return action.payload
    default:
      return state
  }
}

function room(state = null, action) {
  switch (action.type) {
    case 'JOIN_ROOM':
      return action.payload
    default:
      return state
  }
}

function socket(state = {}, action) {
  switch (action.type) {
    case 'CONNECTION_OPEN':
      return Object.assign({}, state, {
        status: 'open',
        channel: action.payload,
        connected_at: new Date()
      })
    case 'CONNECTION_CLOSED':
      return Object.assign({}, state, { status: 'closed', socket: null, connected_at: null })
    default:
      return state
  }
}

function messages(state = [], action) {
  switch (action.type) {
    case 'MESSAGE_RECEIVED':
      const message = action.payload
      return state.concat([ message ])
    case 'CONNECTION_CLOSED':
      return state.concat([ { sender: '$SYS', content: 'connection LOST'} ])
    default:
      return state
  }
}

export default combineReducers({ user, room, socket, messages })
