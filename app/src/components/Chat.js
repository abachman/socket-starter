import React from 'react'
import { connect } from 'react-redux'

import Actions from '../store/actions'

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

const mapStateToProps = (state) => {
  return {
    user: state.user,
    room: state.room,
    messages: state.messages
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
