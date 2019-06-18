import React from 'react'
import { connect } from 'react-redux'

class ConnectionStatus extends React.Component {
  render() {

    const { ws_connected, mqtt_connected } = this.props
    console.log("[ConnectionStatus]", { ws_connected, mqtt_connected })
    const wsClassName = `status ${ws_connected ? 'connected' : 'disconnected'}`
    const mqttClassName = `status ${mqtt_connected ? 'connected' : 'disconnected'}`
    return (
      <div className="connections">
        <span className={wsClassName}></span>
        {' '}
        <span className={mqttClassName}></span>
      </div>
    )
  }
}

const mapStateToProps = state => {
  return {
    ws_connected: state.socket.status === 'open',
    mqtt_connected: state.mqtt.status === 'open',
  }
}

export default connect(mapStateToProps)(ConnectionStatus)
