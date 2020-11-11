const socket = io();
const messageTemplate = $("#message-template").html();
const $messages = document.querySelector("#messages");
// Templates
const locationMessageTemplate = $("#location-message-template").html();
const sidebarTemplate = $("#sidebar-template").html();
//Options
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const autoScroll = () => {
  // New message element
  const $newMessage = $messages.lastElementChild;

  //Height of the new message
  const newMessageStyles = getComputedStyle($newMessage);
  const newMessageMargin = parseInt(newMessageStyles.marginBottom);
  const newMessageHeight = $newMessage.offsetHeight + newMessageMargin;

  //Visible Height
  const visibleHeight = $messages.offsetHeight;

  // height of messages comtainer
  const containerHeight = $messages.scrollHeight;

  // How far have I scrolled
  const scrollOffset = $messages.scrollTop + visibleHeight;

  if (containerHeight - newMessageHeight <= scrollOffset) {
    $messages.scrollTop = $messages.scrollHeight;
  }
};

socket.on("message", (message) => {
  console.log(message.username + " " + message.text);
  const html = Mustache.render(messageTemplate, {
    username: message.username,
    createdAt: moment(message.createdAt).format("h:mm a "),
    message: message.text,
  });
  $("#messages").append(html);
  autoScroll();
});

socket.on("Location", (location) => {
  const html = Mustache.render(locationMessageTemplate, {
    username: location.username,
    url: location.url,
    createdAt: moment(location.createdAt).format("h:mm a"),
  });
  $("#messages").append(html);
  autoScroll();
});

socket.on("roomData", ({ room, users }) => {
  const html = Mustache.render(sidebarTemplate, {
    room,
    users,
  });
  $("#sidebar").html(html);
});

$("#message-form").on("submit", (e) => {
  e.preventDefault();
  $("#send").prop("disabled", true);

  socket.emit("sendMessage", e.target.elements.message.value, (error) => {
    $("#send").prop("disabled", false);
    $("#input").val("");
    $("#input").focus();

    if (error) {
      return console.log(error);
    }

    console.log("Message delievered");
  });
});

$("#send-location").on("click", () => {
  if (!navigator.geolocation) {
    return alert("Geolocation is not supported by your browser");
  }
  navigator.geolocation.getCurrentPosition((position) => {
    $("#send-location").prop("disabled", true);
    socket.emit(
      "Location",
      {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      },
      () => {
        $("#send-location").prop("disabled", false);

        console.log("Location shared");
      }
    );
  });
});

socket.emit("Join", { username, room }, (error) => {
  if (error) {
    alert(error);
    location.href = "/";
  }
});
