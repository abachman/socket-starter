import React from 'react';
import { BrowserRouter as Router, Route } from "react-router-dom";
import { connect } from 'react-redux'

import Chat from './components/Chat'
import Login from './components/Login'
import Actions from './store/actions'

import './stylesheets/App.css';

class App extends React.Component {
  componentDidMount() {
    // connect to websocket on app start
    this.props.dispatch(Actions.connect())
  }

  render() {
    return (
      <Router>
        <Route path="/" exact component={Login} />
        <Route path="/:room" component={Chat} />
      </Router>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    user: state.user,
    room: state.room
  }
}

export default connect(mapStateToProps)(App)
;
