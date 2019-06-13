/*
 * backend.js contains the application logic.
 *
 * Frontend connects to backend. Backend should be safe to update / restart.
 *
 * Backend stores sessions to remember which client_id is associated with which user.
 *
 * For this application, sessions are { user, rooms } objects.
 *
*/
const WebSocket = require('ws'),
      sqlite3 = require('sqlite3');
const sessions = new sqlite3.Database('data/sessions.db');

// db setup
sessions.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY,
    client_id TEXT,
    state TEXT,
    at INTEGER
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_clients ON sessions (client_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_time ON sessions (at);

  CREATE TABLE IF NOT EXISTS session_rooms (
    client_id TEXT,
    room TEXT,
    at INTEGER
  );
  CREATE INDEX IF NOT EXISTS idx_session_rooms ON session_rooms (client_id);
  CREATE INDEX IF NOT EXISTS idx_session_clients ON session_rooms (room);
  CREATE INDEX IF NOT EXISTS idx_session_room_time ON session_rooms (at);
`, function (err) {
  log("migrations run")

  sessions.all("select * from sessions", [], function (err, rows) {
    sessions.all('select * from session_rooms', [], function (err2, rows2) {
      console.log("STARTING WITH sessions", rows)
      console.log("STARTING WITH session_rooms", rows2)
    })
  })
})

const wss = new WebSocket.Server({ port: 8081 });

function log(...args) {
  console.log('[backend]', ...args)
}

const sessionCache = {}

function handleLogin(socket, data, payload) {
  const session_id = data.id

  // AUTHENTICATION HAPPENS HERE
  log('login got', payload)
  const user = { username: payload.user.username }
  const session = { user }

  const out = {
    type: 'login',
    user,
    id: session_id
  }

  const finish = () => {
    const fullSession = Object.assign({}, session, { rooms: [] })
    log('cache full session', fullSession)
    sessionCache[session_id] = fullSession
    socket.send(JSON.stringify(out))
  }

  sessions.get('SELECT * FROM sessions where client_id = ?', [ session_id ], function (err, row) {
    if (row) {
      sessions.run("UPDATE sessions SET state = ?, at = ? WHERE client_id = ?", [JSON.stringify(session), new Date().getTime(), session_id], function () {
        log("updated session")
        finish()
      })
    } else {
      log("create and store session", session)
      sessions.run("INSERT INTO sessions (client_id, state, at) VALUES (?, ?, ?)", [session_id, JSON.stringify(session), new Date().getTime()], function () {
        log("stored session")
        finish()
      })
    }
  })
}

function notifyAll(socket, room, messageObj) {
  const sql = `
    select sessions.state as state, session_rooms.room as room
    from sessions
      inner join session_rooms on session_rooms.client_id = sessions.client_id
    where client_id = ?
  `

  sessions.all("select client_id from session_rooms where room = ?", [room], function (err, rows) {
    rows.forEach(row => {
      messageObj.id = row['client_id']
      log('fwd', messageObj)
      socket.send(JSON.stringify(messageObj))
    })
  })
}

// the state we get from the session table is { "user": { "username": "something" } }
// session_rooms is a 1:N table holding all the rooms that this session is subscribed to
function withSession(session_id, callback) {
  if (!sessionCache[session_id]) {
    log('user not present in sessionCache', session_id)

    sessions.get('select state from sessions where client_id = ?', [session_id], function (err, row) {
      if (!row) callback(null)

      console.log("got existing session", row['state'])
      const session = JSON.parse(row['state'])

      sessions.all('select room from session_rooms where client_id = ?', [session_id], function (err, rows) {
        console.log("got rooms list", rows)
        const rooms = rows.map(r => r['room'])

        // store session locally
        sessionCache[session_id] = Object.assign({}, session, { rooms })

        callback(session)
      })
    })
  } else {
    const session = sessionCache[session_id]
    callback(session)
  }
}

function handleMessage(socket, data, payload, session) {
  if (!session) {
    log('handleMessage with no session for packet', data)
    return socket.send(JSON.stringify({
      type: 'internal',
      action: 'disconnect',
      reason: 'no session',
      id: data.id
    }))
  }

  const { user } = session
  const { room } = payload

  // validate message
  if (!(payload.hasOwnProperty('message') && payload.hasOwnProperty('room'))) {
    log('invalid payload error')
    return socket.send(JSON.stringify({
      type: 'internal',
      action: 'error',
      reason: 'invalid message: payload should be { message, room }',
      id: data.id
    }))
  }

  const { message } = payload

  log("handleMessage with", { user, room, message })
  const out = {
    type: 'message',
    user,
    room,
    message
  }
  notifyAll(socket, room, out)
}

function handleJoin(socket, data, payload, session) {
  const session_id = data.id
  log('handleJoin for session', session_id, payload)

  const room = payload.room
  log("joining", room)

  // update localized cache
  if (session.rooms.indexOf(room) < 0) {
    session.rooms.push(room)
  }
  log('update session cache to', session)
  sessionCache[session_id] = session

  const user = session.user
  const now = new Date().getTime()

  const existingRoomCheckSql = `
    select count(*) as count from session_rooms where client_id = ? AND room = ?
  `

  sessions.get(existingRoomCheckSql, [session_id, room], function (err, row) {
    if (row['count'] > 0) {
      log(user, 'session', session_id, 'is already in', room)
    } else {
      // APPLICATION LOGIC
      log(user, 'session', session_id, 'is joining', room)
      sessions.run("insert into session_rooms (client_id, room, at) VALUES (?, ?, ?)", [session_id, room, now], function (err) {
        log(user, 'session', session_id, "joined room", room)

        // notify all room members that another user has joined
        const out = {
          type: 'join',
          user: user,
          room: room
        }

        notifyAll(socket, room, out)
      })
    }
  })
}


function clearSession(session_id) {
  sessions.exec(`delete from sessions where client_id = '${session_id}';
                 delete from session_rooms where client_id = '${session_id}'`, function (err) {
    if (err) {
      log('error deleting', session_id)
    } else {
      log('cleared session', session_id)
    }
  })
}

function handle(socket, message) {
  const data = JSON.parse(message)
  const session_id = data.id

  let payload = data.payload

  if (typeof payload === 'string') {
    payload = JSON.parse(data.payload)
  }

  if (payload.type === 'login') {
    // creates session
    handleLogin(socket, data, payload)
  } else if (payload.type === 'join') {
    withSession(session_id, (session) => {
      handleJoin(socket, data, payload, session)
    })
  } else if (payload.type === 'close') {
    clearSession(session_id)
  } else {
    withSession(session_id, (session) => {
      handleMessage(socket, data, payload, session)
    })
  }
}

wss.on('connection', (ws) => {
  log('frontend has connected')

  ws.on('message', (message) => {
    log('received:', message);
    handle(ws, message)
  });
});

log("listening on 8081")
