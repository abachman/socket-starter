import React from 'react'
import { connect } from 'react-redux'

class ConnectionStatus extends React.Component {
  render() {
    console.log("[ConnectionStatus]", this.props.connected)
    const className = `status ${this.props.connected ? 'connected' : 'disconnected'}`
    return (
      <span className={className}>()</span>
    )
  }
}

const mapStateToProps = state => {
  return {
    connected: state.socket.status === 'open'
  }
}

export default connect(mapStateToProps)(ConnectionStatus)
