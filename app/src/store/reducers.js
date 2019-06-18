import { combineReducers } from 'redux'

import MQTTClient from '../lib/mqtt'

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
      return Object.assign({}, state, {
        status: 'closed',
        channel: null,
        connected_at: null
      })
    default:
      return state
  }
}

const MQTT = {}
MQTT.subscribe = function (state, payload) {
  const next_subs = Object.assign({}, state.subscriptions, { [payload.topic]: [] })
  return Object.assign({}, state, { subscriptions: next_subs })
}

MQTT.receive = function (state, payload) {
  const { topic, message } = payload
  // concat messages if subscription exists
  let next_messages = [ message ]
  if (topic in state.subscriptions) {
    next_messages = state.subscriptions[topic].concat(next_messages)
  }
  // generate subscriptions object with messages
  const next_subs = Object.assign({}, state.subscriptions, { [topic]: next_messages })
  // apply to state
  return Object.assign({}, state, { subscriptions: next_subs })
}

function mqtt(state = {}, action) {
  switch (action.type) {
    case 'MQTT_READY':
      return Object.assign({}, state, {
        channel: action.payload
      })
    case 'MQTT_CONNECTION_OPEN':
      return Object.assign({}, state, {
        status: 'open',
        connected_at: new Date()
      })
    case 'MQTT_CONNECTION_CLOSED':
      return Object.assign({}, state, {
        status: 'closed',
        channel: null
      })
    case 'MQTT_SUBSCRIBED':
      return MQTT.subscribe(state, action.payload)
    case 'MQTT_MESSAGE_RECEIVED':
      return MQTT.receive(state, action.payload)
    case 'MQTT_CLOSED':
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

export default combineReducers({ user, room, socket, mqtt, messages })

const MessageSelector = {
  getMessages(state, room) {
    return state.mqtt.subscriptions[MQTTClient.messageTopic(room)] || []
  },
}

export {
  MessageSelector
}
