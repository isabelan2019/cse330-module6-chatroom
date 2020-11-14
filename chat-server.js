// Require the packages we will use:
const { count, Console } = require("console");
const http = require("http"),
    fs = require("fs");
const { exit } = require("process");

const port = 3456;
const file = "client.html";
const cssFile = "client.css";

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html, on port 3456:
const server = http.createServer(function (req, res) {
    // This callback runs when a new connection is made to our HTTP server.

    let filePath = path.join(
        __dirname, 
        req.url === "/" ? "client.html" : req.url
    );
   

    fs.readFile(file, function (err, data) {
        // This callback runs when the client.html file has been read from the filesystem.

        if (err) return res.writeHead(500);
        res.writeHead(200);
        res.end(data);
    });

    // fs.readFile(cssFile, function (err, data) {
    //     // This callback runs when the client.css file has been read from the filesystem.

    //     if (err) return res.writeHead(500);
    //     res.writeHead(200);
    //     res.end(data);
    // });


});
server.listen(port);

//css
const path = require('path');


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
        let socket_id = null;
        let recipient_id = null;
        for(let i in users_online){
            if(users_online[i].id==socket.id){
                currentRoom=users_online[i].inRoom;
                socket_nickname=users_online[i].nickname;
                socket_id = users_online[i].id;
            }
            if (users_online[i].nickname==data["to"]){
                recipient_id = users_online[i].id;

            }
        }
        //const recipient = data["to"];
        console.log("Sending messages to Room Name: " + currentRoom);
        console.log("message: " + socket_nickname + " : " + data["message"]); 
        if (data["to"]== "Everyone") {
            console.log("Sending messages to Room Name: " + currentRoom);
            console.log("message: " + socket_nickname + " : " + data["message"]); 
            //broadcast message to all other users in the room
            io.in(currentRoom).emit("message_to_client", { message: socket_nickname + ": " + data["message"] }); 
        }
        else {
            console.log("private message from " + socket_nickname + ": " + data["message"]); 
            io.to(recipient_id).emit("message_to_client", { message: socket_nickname + " sent you a private message: " + data["message"] }); 
            //io.to(data["to"]).emit("message_to_client", { message: socket_nickname + " sent you a private message: " + data["message"] }); 
            //io.in(currentRoom).emit("message_to_client", { message: socket_nickname + " sent you a private message: " + data["message"] });
            
            io.to(socket_id).emit("message_to_client", { message: "you sent a private message to " + data["to"] + ": " + data["message"] }); 


        }
        


    });
    // socket.on("private_message_to_server", function(data){

    // //check that to user is not the same as current user 
    //     //retrieve nickname from the users_online array by using the socket id
    //     let socket_nickname=null;
    //     let currentRoom=null;
    //     for(let i in users_online){
    //         if(users_online[i].id==socket.id){
    //             currentRoom=users_online[i].inRoom;
    //             socket_nickname=users_online[i].nickname;
    //         }
    //     }
    //     const recipient = data["to"];
    //     console.log("sending to "+data["to"]);
    //     console.log("private message from " + socket_nickname + ": " + data["message"]); 
    //     io.to(recipient).emit("message_to_client", { message: socket_nickname + " sent you a private message: " + data["message"] }); 

    //     // if (socket_nickname==data["to"]){
    //     //     //false success 
    //     //     socket.emit("success",{success:false, message:"cannot send yourself a private message"});
    //     // }
    //     // else {

    //     //     io.in(data["to"]).emit("message_to_client", { message: "private message from " + socket_nickname + ": " + data["message"] }); 

    //     // }


    // });

    //This callback runs when the server receives a user to send message to

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
        console.log("CREATE USERS: ");
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
        const roomObject={roomName: data["room_name"],creator:socket.id, usersInRoom:new Array(), password:null, bannedUsers:new Array()};
        console.log("Made a new room: ");
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
            chatrooms.push(roomObject);
            socket.emit("success",{success:true});
            io.sockets.emit("show_rooms",{roomsArray:chatrooms,index:chatrooms.length});
            //join creator to the given room
            socket.join(data["room_name"]);
            //get nickname
            for(let i in users_online){
                if(users_online[i].id==socket.id){
                 
                    //set the inRoom attribute to the room currently in
                    users_online[i].inRoom=data["room_name"];
                }
            }

           
        let room_creator=null;
        let creator_nickname=null;
        let socket_nickname=null;

        for(let i in chatrooms){
            if(chatrooms[i].roomName==data["room_name"]){
                room_creator=chatrooms[i].creator;
            }
        }
        for(let i in users_online){
            //pull the creator nickname
            if(room_creator==users_online[i].id){
                creator_nickname=users_online[i].nickname;
            }
            //pull the socket nickname
            if(socket.id==users_online[i].id){
                socket_nickname=users_online[i].nickname;
            }
        }
        //check if creator is the user
        if(creator_nickname==socket_nickname){
            socket.emit("creator_privileges",{isCreator:true});
            console.log("User is creator");
        }
        console.log("Check creator_name server-side: "+creator_nickname);
        io.in(data["room-name"]).emit("in_chatroom", {room: data["room_name"], creator:creator_nickname});
           
        }
        console.log("CREATE ROOM Chatrooms: ");
        console.log(chatrooms);
        console.log("CREATE ROOM Users online: ");
        console.log(users_online);

        

    });
   
    //This callback runs whenever a user joins the new chatroom
    socket.on('joined_room', function(data){

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

        //join socket to the given room 
        console.log("Info received: " + data["room_name"]);
        for(let i in chatrooms){
            if(chatrooms[i].roomName==data["room_name"]){
                let bannedUsersArray=chatrooms[i].bannedUsers;
                if(bannedUsersArray.length>0){
                    for(let c in bannedUsersArray){
                        if(socket.id==bannedUsersArray[c]){
                            socket.emit("success",{success:false,message:"You are banned from this chat room."});
                        }
                        else{
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
                            
                            let room_creator=null;
                            let creator_nickname=null;
                            for(let i in chatrooms){
                                if(chatrooms[i].roomName==data["room_name"]){
                                    room_creator=chatrooms[i].creator;
                                }
                            }
                            for(let i in users_online){
                                if(room_creator==users_online[i].id){
                                    creator_nickname=users_online[i].nickname;
                                }
                            }
                            io.in(data["room_name"]).emit("in_chatroom", {room: data["room_name"], creator:creator_nickname});
                            
                            console.log("JOIN ROOM Chatrooms: ");
                            console.log(chatrooms);
                            console.log("JOIN ROOM Users online: ");
                            console.log(users_online);
                        }
                    }
                }
                else{
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
                    
                    let room_creator=null;
                    let creator_nickname=null;
                    for(let i in chatrooms){
                        if(chatrooms[i].roomName==data["room_name"]){
                            room_creator=chatrooms[i].creator;
                        }
                    }
                    for(let i in users_online){
                        if(room_creator==users_online[i].id){
                            creator_nickname=users_online[i].nickname;
                        }
                    }
                    io.in(data["room_name"]).emit("in_chatroom", {room: data["room_name"], creator:creator_nickname});
                    
                    console.log("JOIN ROOM Chatrooms: ");
                    console.log(chatrooms);
                    console.log("JOIN ROOM Users online: ");
                    console.log(users_online);
                }
                
            }
        }
       
       
      
        
    });
   
    socket.on("update_room_users",function(data){
       //scan through the users_online array to get all the users in this room
       for(let c in chatrooms){
        let roomName = null;
        let roomCreator = null;
        let chatroom_name=chatrooms[c].roomName;
        console.log("Check chatroom_name: " + chatroom_name);
        let usersInThisRoom = new Array();
        for (let i in users_online){
            if(users_online[i].inRoom==chatroom_name){
            let socket_nickname=users_online[i].nickname;
            //push to new array
            usersInThisRoom.push(socket_nickname);
            }
        }
        console.log("Check usersInThisRoom: "+usersInThisRoom);
        chatrooms[c].usersInRoom=usersInThisRoom; 
        
        io.in(chatroom_name).emit("show_users", {usersArray:usersInThisRoom});
        
        // roomName=chatrooms[i].roomName;
        // roomCreator=chatrooms[i].creator; 
        // let creator_nickname=null;
        // for(let i in users_online){
        //     if(roomCreator==users_online[i].id){
        //         creator_nickname=users_online[i].nickname;
        //     }
        // };
        // io.in(chatroom_name).emit("in_chatroom", {room:roomName, creator:creator_nickname})
         }
        console.log("UPDATE FUNCTION CHATROOMS: ");
        console.log(chatrooms);
        console.log("UPDATE FUNCTION ALL USERS: ");
        console.log(users_online);

    //    for (let i in users_online){
    //     //if any users are in this room
    //     if(users_online[i].inRoom==data["room_name"]){
    //         //retrieve their user nickname
    //         let socket_nickname=users_online[i].nickname;
    //         //push to new array
    //         usersInThisRoom.push(socket_nickname);
    //         }
    //     }
        // for (let i in chatrooms){
        //     if(chatrooms[i].roomName==data["room_name"]){
        //         chatrooms[i].usersInRoom=usersInThisRoom;
        //         console.log("Array in chatroom attribute: " + chatrooms[i].usersInRoom);
        //         roomName=chatrooms[i].roomName;
        //         roomCreator=chatrooms[i].creator;
        //     }
        // }
        
        
        // io.in(data["room_name"]).emit("show_users", {usersArray:usersInThisRoom});

        //show chatroom info

        // get nickname of creator 
        // let creator_nickname=null;
        // for(let i in users_online){
        //     if(roomCreator==users_online[i].id){
        //         creator_nickname=users_online[i].nickname;
        //     }
        // };

        // io.in(data["room_name"]).emit("in_chatroom", {room:roomName, creator:creator_nickname})

        // if (socket.id == currentRoom.creator) {
        //     io.in(currentRoom).emit("creator_privileges", {iscreator: true})
        // }
        });
    socket.on("kickOut",function(data){
        let currentRoom=null;
        let creator=null;
        for(let i in users_online){
            if(socket.id==users_online[i].id){
                currentRoom=users_online[i].inRoom;
            }
        }
        for(let i in chatrooms){
            if(currentRoom==chatrooms[i].roomName){
                creator=chatrooms[i].creator;
            }
        }
        if(socket.id==creator){
            for(let i in users_online){
                
                    if(data["kickUser"]==users_online[i].nickname){
                        users_online[i].inRoom=null;
                        let userID=users_online[i].id;
                        let socketKicked=io.sockets.sockets.get(userID);
                        socketKicked.leave(currentRoom);
                        io.to(userID).emit("message",{action:"You have been kicked out of the chat."});
            
                    }
                }
        }
        else{
            socket.emit("success",{success:false,message:"Only creators of the chat can kick users."});
        }
            
        
    });
    socket.on("banUser",function(data){
        let currentRoom=null;
        let creator=null;
        let bannedsocketID=null;
        //retrieve current room
        for(let i in users_online){
            if(socket.id==users_online[i].id){
                currentRoom=users_online[i].inRoom;
            }
        }
        //retrieve creator of current room
        for(let i in chatrooms){
            if(currentRoom==chatrooms[i].roomName){
                creator=chatrooms[i].creator;
            }
        }
        //check if the socket is the creator
        if(socket.id==creator){
            
            for(let i in users_online){
                //retrieve from users online array the banned user socket
                if(data["banUser"]==users_online[i].nickname){
                    users_online[i].inRoom=null;
                    bannedsocketID=users_online[i].id;
                    //have that socket leave the room
                    let socketKicked=io.sockets.sockets.get(bannedsocketID);
                    socketKicked.leave(currentRoom);
                    io.to(bannedsocketID).emit("message",{action:"You have been banned from the chat."});
                }
            }
            for (let i in chatrooms){
                //find current room in chat rooms array
                if(chatrooms[i].roomName==currentRoom){
                //push to the banned users array
                chatrooms[i].bannedUsers.push(bannedsocketID);
                }
            }
           
            console.log("Banned Users Chatrooms: ");
            console.log(chatrooms);
        }
        else{
            socket.emit("success",{success:false,message:"Only creators of the chat can ban users."});
        }
        

    })

   
    
  
});