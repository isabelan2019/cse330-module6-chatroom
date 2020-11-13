// Require the packages we will use:
const { count } = require("console");
const http = require("http"),
    fs = require("fs");
const { exit } = require("process");

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
    io.sockets.emit("show_rooms",{roomsArray:chatrooms,index:chatrooms.length});
 
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
        console.log(userObject);

        //check id isnt already in array (cannot have multiple usernames)
        let idExists=0;
        for (i in users_online) {
            if (users_online[i].id == userObject.id) {
                //chat name already exists 
                idExists++;
                //console.log(nameExists);
            }
        }
        let nameExists=0;
        for (i in users_online) {
            if (users_online[i].nickname == userObject.nickname) {
                //chat name already exists 
                nameExists++;
                //console.log(nameExists);
            }
        }
        if (nameExists>0) {
            socket.emit("success",{success:false, message:"name already exists"});
        } else if (idExists>0) {
            socket.emit("success",{success:false, message:"you already have a username"});
        }
        else {
            users_online.push(userObject);
            socket.emit("success",{success:true});

        }
         console.log(users_online);
        
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
        const roomObject={roomName: data["room_name"],creator:socket.id, usersInRoom:null, password:data["room_password"]};
        console.log(roomObject); 
        console.log(chatrooms);

        let nameExists=0;
        for (i in chatrooms) {
            if (chatrooms[i].roomName == roomObject.roomName) {
                //chat name already exists 
                nameExists++;
                //console.log(nameExists);
            }
        }
        
        if (nameExists>0) {
            socket.emit("success",{success:false, message:"room name already exists"});
        }
        else {
            console.log(chatrooms.includes(roomObject));

            chatrooms.push(roomObject);
            socket.emit("success",{success:true});
            
            io.sockets.emit("show_rooms",{roomsArray:chatrooms,index:chatrooms.length});

            //join creator to the given room
            socket.join(data["room_name"]);

            //get nickname
            let socket_nickname=null;
            for(let i in users_online){
                if(users_online[i].id==socket.id){
                    socket_nickname=users_online[i].nickname;
                }
            }

            const roomsIn=socket.rooms;
            let iterator =socket.rooms.values();
            let currentRoom=iterator.next().value;
            let currentRoomName = null;
            let hostinroom = new Array();
            hostinroom.push(socket_nickname);
            //add creator to the usersInRoom array 
            for (let i in chatrooms){
                if(chatrooms[i].roomName==data["room_name"]){
                    chatrooms[i].usersInRoom=hostinroom;
                    currentRoomName = chatrooms[i].roomName;
                }
            }
            console.log(chatrooms);
            io.in(currentRoom).emit("show_users", {usersArray:hostinroom})

            //give chatroom info
            io.in(currentRoom).emit("in_chatroom", {room:currentRoomName, creator:socket_nickname})
            //creator privileges 
            io.in(currentRoom).emit("creator_privileges", {iscreator: true})

            
        }


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
        let roomName = null;
        let roomCreator = null;
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
                roomName=chatrooms[i].roomName;
                roomCreator=chatrooms[i].creator;
            }
        }
        

        io.in(currentRoom).emit("show_users", {usersArray:usersInThisRoom});

        //show chatroom info

        //get nickname of creator 
        let creator_nickname=null;
        for(let i in users_online){
            if(roomCreator==users_online[i].id){
                creator_nickname=users_online[i].nickname;
            }
        };

        io.in(currentRoom).emit("in_chatroom", {room:roomName, creator:creator_nickname})

        // if (socket.id == currentRoom.creator) {
        //     io.in(currentRoom).emit("creator_privileges", {iscreator: true})
        // }
        
    })
   
});