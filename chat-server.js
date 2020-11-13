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
        // const roomsIn=socket.rooms;
        // let iterator =socket.rooms.values();
        // let currentRoom=iterator.next().value;
        let currentRoom=null;
        //log the current room that message is being sent in
        
        //retrieve nickname from the users_online array by using the socket id
        let socket_nickname=null;
        for(let i in users_online){
            if(users_online[i].id==socket.id){
                currentRoom=users_online[i].inRoom;
                socket_nickname=users_online[i].nickname;
            }
        }
        console.log("Sending messages " + currentRoom);
        console.log("message: " + socket_nickname + " : " + data["message"]); 
        //broadcast message to all other users in the room
        io.in(currentRoom).emit("message_to_client", { message: socket_nickname + ": " + data["message"] }); 
    });

    // This callback runs when the server receives a new username sign in
    socket.on('nickname',function(data){
        const userObject = {nickname: data["user"],id: socket.id,inRoom:socket.id};
        //check id isnt already in array (cannot have multiple usernames)
        let idExists =false;
        // console.log(idExists);

        for (i in users_online) {
            if (users_online[i].id == userObject.id) {
                //chat name already exists 
                idExists=true;
                //console.log(nameExists);
            }
        }
        let nameExists=false;
        for (i in users_online) {
            if (users_online[i].nickname == userObject.nickname) {
                //chat name already exists 
                nameExists=true;
                //console.log(nameExists);
            }
        }
        // console.log(nameExists);
        if (nameExists==true) {
            socket.emit("success",{success:false, message:"Name already exists"});
        } else if (idExists==true) {
            socket.emit("success",{success:false, message:"You already have a username"});
        }
        else {
            users_online.push(userObject);
            socket.emit("success",{success:true});

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
        //create chatroom JSON object 
        const roomObject={roomName: data["room_name"],creator:socket.id, usersInRoom:new Array(), password:null};
        console.log(roomObject); 

        let nameExists=false;
        for (i in chatrooms) {
            if (chatrooms[i].roomName == roomObject.roomName) {
                //chat name already exists 
                nameExists=true;
                //console.log(nameExists);
            }
        }
        
        if (nameExists==true) {
            socket.emit("success",{success:false, message:"Room name already exists"});
        }
        else {
          //  console.log(chatrooms.includes(roomObject));
            chatrooms.push(roomObject);
            socket.emit("success",{success:true});
            io.sockets.emit("show_rooms",{roomsArray:chatrooms,index:chatrooms.length});
            //join creator to the given room
            socket.join(data["room_name"]);
            //get nickname
            let socket_nickname=null;
            for(let i in users_online){
                if(users_online[i].id==socket.id){
                    //retrieve the nickname based on the userid
                    //socket_nickname=users_online[i].nickname;
                    //set the inRoom attribute to the room currently in
                    users_online[i].inRoom=data["room_name"];
                }
            }

            // const roomsIn=socket.rooms;
            // let iterator =socket.rooms.values();
            // let currentRoom=iterator.next().value;
            // let currentRoomName = null;
            // let hostinroom = new Array();
            // hostinroom.push(socket_nickname);
            //add creator to the usersInRoom array 
            for (let i in chatrooms){
                if(chatrooms[i].roomName==data["room_name"]){
                    chatrooms[i].usersInRoom.push(socket_nickname);
                    //currentRoomName = chatrooms[i].roomName;
                }
            }
            // console.log(chatrooms);
            // io.in(currentRoom).emit("show_users", {usersArray:hostinroom})

            //give chatroom info
            // io.in(currentRoom).emit("in_chatroom", {room:data["room_name"], creator:socket_nickname})
            //creator privileges 
            // io.in(currentRoom).emit("creator_privileges", {iscreator: true})

           
        }
        console.log("Chatrooms: " + chatrooms);
        console.log("Users online: " + users_online);

    });
   
    //This callback runs whenever a user joins the new chatroom
    socket.on('joined_room', function(data){
        // const roomsIn=socket.rooms;
        // let iterator =socket.rooms.values();
        // let currentRoom=iterator.next().value;
        let currentRoom=null;
        for(let i in users_online){
            if(socket.id==users_online[i].id){
                console.log("Old room: "+ users_online[i].inRoom);
                currentRoom=users_online[i].inRoom;
            }
        }
        
        //leave current room
        socket.leave(currentRoom);
        //set inRoom attribute to null
        // for (let i in users_online){
        //     if(socket.id==users_online[i].id && users_online.inRoom==socket.id){
        //         users_online.inRoom=null;
        //     }
        // }
        // console.log(roomsIn);
        // console.log(currentRoom);
        //console.log(data["room_name"]);

        //join socket to the given room 
        console.log("Info received: " + data["room_name"]);
        socket.join(data["room_name"]);
        //set inRoom attribute of socket to the current room
        for (let i in users_online){
            if(socket.id==users_online[i].id){
                //set inRoom attribute of user to current room (button clicked)
                users_online[i].inRoom=data["room_name"];
                console.log("New room: "+ users_online[i].inRoom);
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
        console.log("Chatrooms: " + chatrooms);
        console.log("Users online: "+ users_online);
       
      
        
    });
   
    socket.on("show_room_info",function(data){
       let roomName = null;
       let roomCreator = null;
       let usersInThisRoom = new Array();
       //scan through the users_online array to get all the users in this room
       for (let i in users_online){
        //if any users are in this room
        if(users_online[i].inRoom==data["room_name"]){
            //retrieve their user nickname
            let socket_nickname=users_online[i].nickname;
            //push to new array
            usersInThisRoom.push(socket_nickname);
            }
        }
        console.log("All users in room: " + usersInThisRoom);
        for (let i in chatrooms){
            if(chatrooms[i].roomName==data["room_name"]){
                chatrooms[i].usersInRoom=usersInThisRoom;
                console.log("Array in chatroom attribute: " + chatrooms[i].usersInRoom);
                roomName=chatrooms[i].roomName;
                roomCreator=chatrooms[i].creator;
            }
        }
        
        
        io.in(data["room_name"]).emit("show_users", {usersArray:usersInThisRoom});

        //show chatroom info

        // get nickname of creator 
        let creator_nickname=null;
        for(let i in users_online){
            if(roomCreator==users_online[i].id){
                creator_nickname=users_online[i].nickname;
            }
        };

        io.in(data["room_name"]).emit("in_chatroom", {room:roomName, creator:creator_nickname})

        // if (socket.id == currentRoom.creator) {
        //     io.in(currentRoom).emit("creator_privileges", {iscreator: true})
        // }
    });
});