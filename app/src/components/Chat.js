import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import Actions from '../store/actions'
import ConnectionStatus from './ConnectionStatus'
import { MessageSelector } from '../store/reducers'

import '../stylesheets/chat.css'


class ChatForm extends React.Component {
  constructor(...args) {
    super(...args)
    this.state = { message: '' }

    this.handleChange = this.handleChange.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)

    this.field = React.createRef()
  }

  componentDidMount() {
    this.field.current.focus()
  }

  handleChange(evt) {
    this.setState({ message: evt.target.value })
  }

  handleSubmit(evt) {
    evt.preventDefault()
    this.props.publish(this.state.message)
    this.setState({ message: '' })
  }

  render() {
    return(
      <form onSubmit={this.handleSubmit} className="chat-form">
        <input type="text" onChange={this.handleChange} value={this.state.message} placeholder="message" ref={this.field} />
        <input type="submit" value="Send" />
      </form>
    )
  }
}

connect()(ChatForm)

class Message extends React.Component {
  static propTypes = {
    message: PropTypes.shape({
      sender: PropTypes.string.isRequired,
      content: PropTypes.string.isRequired
    }).isRequired
  }

  render() {
    const { message, user } = this.props

    if (message.sender) {
      const className =`message ${message.sender === user.username ? 'owner' : ''} ${message.type}`
      return (
        <div className={className}>
          <div className="sender">{ this.props.message.sender }</div>
          <div className="content">{ this.props.message.content }</div>
        </div>
      )
    } else {
      return null
    }
  }
}

class Chat extends React.Component {
  componentDidMount() {
    if (this.props.user === null) {
      this.props.history.push('/')
    }
  }

  render() {
    const { match, user } = this.props

    return (
      <div className="App chat">
        <header>
          <ConnectionStatus />
          <h1>{match.params.room}</h1>
        </header>
        <main>
          <div className="chat-window">
            <div className="messages">
              { this.props.messages.map((msg, idx) => <Message message={msg} user={user} key={idx} />) }
            </div>
            <ChatForm publish={this.props.publish} />
          </div>
        </main>
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => {
  const room = ownProps.match.params.room
  const messages = MessageSelector.getMessages(state, room)

  return {
    user: state.user,
    room: state.room,
    messages
  }
}

const mapDispatchToProps = (dispatch) => {
  return {
    connect(user, room) {
      return dispatch(Actions.connect(user, room))
    },

    publish(message) {
      return dispatch(Actions.publish(message))
    }
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Chat)
