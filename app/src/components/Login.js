import React from 'react'
import { connect } from 'react-redux'

import Actions from '../store/actions'

import '../stylesheets/login.css'

class LoginForm extends React.Component {
  constructor(...args) {
    super(...args)
    this.handleSubmit = this.handleSubmit.bind(this);
    this.field = React.createRef()
  }

  componentDidMount() {
    this.field.current.focus()
  }

  handleSubmit(evt) {
    evt.preventDefault()
    const username = this.field.current.value
    this.props.dispatch(Actions.login({ username }))
  }

  render() {
    return (
      <form className='form-2' onSubmit={this.handleSubmit}>
        <label>
          <span>Username</span>
          <input type='text' name='username' className='input-field' defaultValue={this.props.username} ref={this.field} />
        </label>
        <input type='submit' value='Sign In' />
      </form>
    )
  }
}

class JoinForm extends React.Component {
  constructor(...args) {
    super(...args)
    this.handleSubmit = this.handleSubmit.bind(this);
    this.field = React.createRef()
  }

  componentDidMount() {
    this.field.current.focus()
  }

  handleSubmit(evt) {
    evt.preventDefault()
    const room = this.field.current.value
    this.props.dispatch(Actions.join(room))
    this.props.history.push(`/${room}`)
  }

  render() {
    return (
      <form className='form-2' onSubmit={this.handleSubmit}>
        <label>
          <span>Room</span>
          <input type='text' name='room' className='input-field' defaultValue={this.props.room} ref={this.field} />
        </label>
        <input type='submit' value='Join' />
      </form>
    )
  }

}

function Login(props) {
  return (
    <div className="App">
      <header>
        <p>{ props.username ? 'Hi ' + props.username + '!' : 'Chat.' }</p>
        { props.username ? <JoinForm {...props} /> : <LoginForm {...props} />}
      </header>
    </div>
  )
}

const mapStateToProps = state => {
  return {
    username: state.user ? state.user.username : null,
    connected: state.socket.status === 'open',
    room: state.room
  }
}

export default connect(mapStateToProps)(Login)
