# socket-starter

**Problem**: zero-downtime HTTP servers are relatively common and easy to describe and build. Deploy code, start updated service, tell old service to stop serving new requests, turn it off when all requests have completed. HTTP is a stateless protocol, so new requests can safely be served by the new service while old requests are completed by the old one. HTTP proxying and load balancing servers don't need to know anything about application logic.

Long term sockets (**streaming** servers) are more problematic because deploying a new instance of a streaming server will disconnect every client briefly. There is no request response cycle and connections are stateful.

To prevent the disconnection of every client when restarting the streaming service, this project uses a "frontend" streaming server that stands between the load balancer and the "backend" (application logic) service. This will allow sessions to be initialized in the frontend and application logic to exist on the backend.



## Services


### Frontend

Client connections terminate here. Connections are initialized and given a unique session ID. All messages from the client are wrapped in an envelope which includes the session_id and passed to the backend.

frontend should be a simple, stateless, zero business logic proxy service that never has to restart. It is comparable to a project like [einhorn](https://github.com/stripe/einhorn) but is slightly more complex since the client connections *must* stay open when the backend restarts.


### Backend

This is where the logic of the service is executed.

The backend has to track session IDs and associate them with users so that messages to rooms can be broadcast to every user in the room.


### Client

Demonstration of a React chat application.

Users "sign in", join a room, and start chatting. All users in the same room will see other users' messages.

The one big catch in the Client application is that when the websocket connection is terminated by the server, you have to refresh the window. This was done to illustrate the ability to update and restart the backend server without breaking the client-to-frontend websocket connection.


## Usage

This project includes three applications, frontend and backend websocket servers and the client React app.

Start backend:

```sh
socket-starter/ $ cd backend
socket-starter/backend/ $ npm install
socket-starter/backend/ $ npm start
```

Start frontend:

```sh
socket-starter/ $ cd frontend
socket-starter/frontend/ $ npm install
socket-starter/frontend/ $ npm start
```

Start client:

```sh
socket-starter/ $ cd app
socket-starter/backend/ $ npm install
socket-starter/backend/ $ npm start
```

Changing code within one of the application directories will cause the service
