// Require the packages we will use:
const { count } = require("console");
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
//initialize Array of all users online
let users_online = new Array();
//initialize Array of all chatrooms available
let chatrooms = new Array();
// Import Socket.IO and pass our HTTP server object to it.
const socketio = require("socket.io")(server, {
    wsEngine: 'ws'
});

// Attach our Socket.IO server to our HTTP server to listen
const io = socketio.listen(server);

// This callback runs when a new Socket.IO connection is established.
io.sockets.on("connection", function (socket) {
 
    // This callback runs when the server receives a new message from the client.
    socket.on('message_to_server', function (data) {
        // console.log(socket.id);
        //there should only be one room that socket is in so return that one value from set
        const roomsIn=socket.rooms;
        let iterator =socket.rooms.values();
        let currentRoom=iterator.next().value;
        // console.log(roomsIn);
        console.log(currentRoom);
        // console.log(roomsIn);
        // console.log(iterator);
        // console.log(currentRoom);
        // console.log(iterator.next().value);
        let socket_nickname=null;
        for(let i in users_online){
            if(users_online[i].id==socket.id){
                socket_nickname=users_online[i].nickname;
            }
        }
        console.log(socket_nickname);
        console.log("message: " + socket_nickname + " : " + data["message"]); // log it to the Node.JS output
        io.in(currentRoom).emit("message_to_client", { message: socket_nickname + ": " + data["message"] }); // broadcast the message to other users
    });

    // This callback runs when the server receives a new username sign in
    socket.on('nickname',function(data){
        const userObject = {nickname: data["user"],id: socket.id,inRoom:socket.id};
        if(users_online.includes(userObject)==false){
            users_online.push(userObject);
        }
         console.log(users_online);
        socket.emit("success",{success:true});
    });
    // // If a client disconnects, removes from users_online array
    // socket.on('disconnect',function(data){
    //     for (let i in users_online){
    //         if(users_online[i].id==socket.id){
    //             users_online.splice(i,1);
    //         }
    //     }
    // });
   
    
    //This callback runs when the server receives a new chatroom name
    socket.on('room_name', function(data){
        //create chatroom JSON object 
        const roomObject={roomName: data["room_name"],creator:socket.id,usersInRoom:null};
        console.log(roomObject); 
        chatrooms.push(roomObject);
        io.sockets.emit("show_rooms",{roomsArray:chatrooms,index:chatrooms.length});
        
        socket.emit("success",{success:true});


        //join creator to the given room
        socket.join(data["room_name"]);

        //get nickname
        let socket_nickname=null;
        for(let i in users_online){
            if(users_online[i].id==socket.id){
                socket_nickname=users_online[i].nickname;
            }
        }
        let currentRoom = null;
        let hostinroom = new Array();
        hostinroom.push(socket_nickname);
        //add creator to the usersInRoom array 
        for (let i in chatrooms){
            if(chatrooms[i].roomName==data["room_name"]){
                chatrooms[i].usersInRoom=hostinroom;
                currentRoom = chatrooms[i];
            }
        }
        console.log(chatrooms);
        io.in(currentRoom).emit("show_users", {usersArray:hostinroom})

        //give chatroom info
        io.in(currentRoom).emit("in_chatroom", {room:currentRoom.roomName, creator:socket_nickname})
        //creator privileges 
        io.in(currentRoom).emit("creator_privileges", {iscreator: true})


    })
   
    //This callback runs whenever a user joins the new chatroom
    socket.on('joined_room', function(data){
        const roomsIn=socket.rooms;
        let iterator =socket.rooms.values();
        let currentRoom=iterator.next().value;
        socket.leave(currentRoom);
        for (let i in users_online){
            if(socket.id==users_online[i].id && users_online.inRoom==socket.id){
                users_online.inRoom=null;
            }
        }
        // console.log(roomsIn);
        // console.log(currentRoom);
        //console.log(data["room_name"]);

        //join socket to the given room 
        socket.join(data["room_name"]);
        for (let i in users_online){
            if(socket.id==users_online[i].id){
                users_online[i].inRoom=data["room_name"];

            }
        }
        //update array of clients in a room
        //const usersInRoom=io.in(data["room_name"]).allSockets();
        //console.log(usersInRoom);
        // for (let i in chatrooms){
        //     if(chatrooms[i].roomName==data["room_name"]){
        //         chatrooms[i].usersInRoomSet=usersInRoom;
        //     }
        // }
       let usersInThisRoom = new Array();
       for (let i in users_online){
        if(users_online[i].inRoom==data["room_name"]){
            usersInThisRoom.push(users_online[i].nickname);
            }
            console.log(users_online);
        }
        console.log(usersInThisRoom);
        for (let i in chatrooms){
            if(chatrooms[i].roomName==data["room_name"]){
                chatrooms[i].usersInRoom=usersInThisRoom;
            }
        }
        

        io.in(currentRoom).emit("show_users", {usersArray:usersInThisRoom});

        //show chatroom info

        //get nickname 
        let socket_nickname=null;
        for(let i in users_online){
            if(users_online[i].id==socket.id){
                socket_nickname=users_online[i].nickname;
            }
        };

        io.in(currentRoom).emit("in_chatroom", {room:currentRoom.roomName, creator:socket_nickname})
        
    })
   
});