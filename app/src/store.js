import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'

import reducer from './store/reducers'

function logger({ getState }) {
  return next => action => {
    const before = getState()

    // Call the next dispatch method in the middleware chain.
    const returnValue = next(action)

    console.groupCollapsed(action.type)
    console.log('dispatched', action)
    console.log('state before', before)
    console.log('state after', getState())
    console.groupEnd()

    // This will likely be the action itself, unless
    // a middleware further in chain changed it.
    return returnValue
  }
}

const initialState = {
  room: null,
  user: null,
  socket: { status: 'closed', connected_at: null, channel: null },
  messages: []
}

const store = createStore(reducer, initialState, applyMiddleware(thunk, logger))

export default store
