// Require the packages we will use:
const http = require("http"),
    fs = require("fs");

const port = 3456;
const file = "client.html";
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html, on port 3456:
const server = http.createServer(function (req, res) {
    // This callback runs when a new connection is made to our HTTP server.

    fs.readFile(file, function (err, data) {
        // This callback runs when the client.html file has been read from the filesystem.

        if (err) return res.writeHead(500);
        res.writeHead(200);
        res.end(data);
    });
});
server.listen(port);

let users_online = new Array();
let chatrooms = new Array();
// Import Socket.IO and pass our HTTP server object to it.
const socketio = require("socket.io")(server);

// Attach our Socket.IO server to our HTTP server to listen
const io = socketio.listen(server);

// This callback runs when a new Socket.IO connection is established.
io.sockets.on("connection", function (socket) {
 
    // This callback runs when the server receives a new message from the client.
    socket.on('message_to_server', function (data) {
        console.log(socket.id);
        let socket_nickname=null;
        for(let i in users_online){
            if(users_online[i].id==socket.id){
                socket_nickname=users_online[i].nickname;
            }
        }
        console.log(socket_nickname);
        console.log("message: " + data["message"]); // log it to the Node.JS output
        io.sockets.emit("message_to_client", { message: socket_nickname + ": " + data["message"] }) // broadcast the message to other users
    });

    // This callback runs when the server receives a new username sign in
    socket.on('nickname',function(data){
        const userObject = {nickname: data["user"],id: socket.id};
        if(users_online.includes(userObject)==false){
            users_online.push(userObject);
        }
        for(let i in users_online){
            io.sockets.emit("show_users", {usersArray:users_online[i].nickname})
        }
        console.log(users_online);
    });
    // If a client disconnects, removes from users_online array
    socket.on('disconnect',function(data){
        for (let i in users_online){
            if(users_online[i].id==socket.id){
                users_online.splice(i,1);
            }
        }
    });
   
    //This callback runs when the server receives a new chatroom name
    socket.on('room_name', function(data){
        const roomObject={roomName: data["roomName"],password:data["password"],usersInRoom:null};
        io.sockets.emit("show_rooms",{roomsArray:chatrooms});
    })
    
});