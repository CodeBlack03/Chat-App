const path = require("path");
const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require("./utils/users");

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, "../public");

app.use(express.static(publicDirectoryPath));

io.on("connection", (socket) => {
  console.log("New Web Socket connection");

  socket.on("Join", (options, callback) => {
    const { error, user } = addUser({ id: socket.id, ...options });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);

    socket.emit(
      "message",
      generateMessage({ username: user.username, text: "Welcome" })
    );
    socket.broadcast.to(user.room).emit(
      "message",
      generateMessage({
        username: user.username,
        text: `${user.username} has joined!`,
      })
    );
    io.to(user.room).emit("roomData", {
      users: getUsersInRoom(user.room),
      room: user.room,
    });
    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    if (!user) {
      return callback("No user found");
    }

    const filter = new Filter();
    if (filter.isProfane(message)) {
      return callback("Profanity is not allowed!");
    }

    io.to(user.room).emit(
      "message",
      generateMessage({ username: user.username, text: message })
    );
    callback();
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage({
          username: user.username,
          text: `${user.username} has left!`,
        })
      );
      io.to(user.room).emit("roomData", {
        users: getUsersInRoom(user.room),
        room: user.room,
      });
    }
  });
  socket.on("Location", (location, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit(
      "Location",
      generateLocationMessage({
        username: user.username,
        url: `https://google.com/maps?q=${location.latitude},${location.longitude}`,
      })
    );
    callback();
  });
});

server.listen(port, () => console.log(`Example app listening on 3000 port!`));
