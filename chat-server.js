// Require the packages we will use:
const { count, Console } = require("console");
const http = require("http"),
    fs = require("fs");
const { exit } = require("process");

const port = 3456;
const file = "client.html";
const cssFile = "style.css";

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html, on port 3456:
const server = http.createServer(function (req, res) {
    // This callback runs when a new connection is made to our HTTP server.
    let filePath = path.join(
        __dirname, 
        req.url === "/" ? "client.html" : req.url

    );
   

    fs.readFile(filePath, function (err, data) {
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
const { PRIORITY_ABOVE_NORMAL } = require("constants");


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

        let currentRoom=null;
        //log the current room that message is being sent in
        
        //retrieve nickname from the users_online array by using the socket id
        let socket_nickname=null;
        let recipient_id = null;
        for(let i in users_online){
            if(users_online[i].id==socket.id){
                currentRoom=users_online[i].inRoom;
                socket_nickname=users_online[i].nickname;
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
            let socketTo=io.sockets.sockets.get(recipient_id);
            socketTo.emit("message_to_client", { message: "Private message from "+ socket_nickname + " to " + data["to"] + " : " + data["message"] });
            console.log("Private message from " + socket_nickname + "to " + data["to"]+ ": " + data["message"]); 
           
            
            socket.emit("message_to_client", { message: "Private message from "+ socket_nickname + " to " + data["to"] + " : " + data["message"] }); 


        }
        


    });
   
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
        io.sockets.emit("disconnectedSocket");
        //check if client disconnects and if they're the last ones, then delete room
        for (let i in users_online){
            if(users_online[i].id==socket.id){
                users_online.splice(i,1);
            }
        }
    });
   
    
    //This callback runs when the server receives a new chatroom name
    socket.on('room_name', function(data){
        //create chatroom JSON object 
        let roomObject=null;
        console.log("room password" + data["room_password"]);

        if (data["room_password"] != null){
            //password exists 
            roomObject={roomName: data["room_name"],roomPassword:data["room_password"],creator:socket.id, usersInRoom:new Array(), bannedUsers:new Array()};
        }
        else  {
            roomObject={roomName: data["room_name"],creator:socket.id, usersInRoom:new Array(), bannedUsers:new Array()};
        }

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
                
            }
            //check if creator is the user
            if(room_creator==socket.id){
                socket.emit("creator_privileges",{isCreator:true});
                console.log("User is creator");
            }
            console.log("Check creator_name server-side: "+creator_nickname);
            io.in(data["room_name"]).emit("in_chatroom", {room: data["room_name"], creator:creator_nickname});
            
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

        //join socket to the given room 
        console.log("Info received: " + data["room_password"]);
        for(let i in chatrooms){
            if(chatrooms[i].roomName==data["room_name"]){
                let bannedUsersArray=chatrooms[i].bannedUsers;
                if(bannedUsersArray.length>0){
                    for(let c in bannedUsersArray){
                        if(socket.id==bannedUsersArray[c]){
                            socket.emit("banned",{banned:true,message:"You are banned from this chat room."});
                        }
                        else{
                            //check password
                            //console.log("this room "+chatrooms[i]);
                            let passwordcheck=null;
                            if (chatrooms[i].roomPassword != null) {
                                //has a password so check 
                                if (chatrooms[i].roomPassword == data["room_password"]){
                                    passwordcheck="true";
                                }
                                else {
                                    passwordcheck="false";
                                }

                            }
                            if (passwordcheck!="false"){
                                socket.join(data["room_name"]);
                                //set inRoom attribute of socket to the current room
                                for (let i in users_online){
                                    if(socket.id==users_online[i].id){
                                        //set inRoom attribute of user to current room (button clicked)
                                        users_online[i].inRoom=data["room_name"];
                                        //console.log("New room: "+ users_online[i].inRoom);
                                    }
                                }
                                //console.log("password check ");

                                
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
                                if(socket.id==room_creator){
                                    socket.emit("creator_privileges",{isCreator:true});
                                }
                                else{
                                    socket.emit("creator_privileges",{isCreator:false});
                                }
                                io.in(data["room_name"]).emit("in_chatroom", {room: data["room_name"], creator:creator_nickname});
                                
                                console.log("JOIN a ROOM Chatrooms: ");
                                console.log(chatrooms);
                                console.log("JOIN ROOM Users online: ");
                                console.log(users_online);

                            }
                            else {
                                socket.emit("success",{success:false,message:"wrong password."});

                            }
                            
                        }
                    }
                }
                else{
                    //check password
                    console.log("this room "+chatrooms[i]);
                    let passwordcheck=null;
                    if (chatrooms[i].roomPassword != null) {
                        //has a password so check 
                        if (chatrooms[i].roomPassword == data["room_password"]){
                            passwordcheck="true";
                        }
                        else {
                            passwordcheck="false";
                        }

                    }
                    console.log("password check "+ passwordcheck);
                    if (passwordcheck!="false") {
                        socket.join(data["room_name"]);
                        //set inRoom attribute of socket to the current room
                        for (let i in users_online){
                            if(socket.id==users_online[i].id){
                                //set inRoom attribute of user to current room (button clicked)
                                users_online[i].inRoom=data["room_name"];
                                console.log("New room: "+ users_online[i].inRoom);
                            }
                        }
                        
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
                        if(socket.id==room_creator){
                            socket.emit("creator_privileges",{isCreator:true});
                        }
                        else{
                            socket.emit("creator_privileges",{isCreator:false});
                        }
                        io.in(data["room_name"]).emit("in_chatroom", {room: data["room_name"], creator:creator_nickname});
                        
                        console.log("JOIN ROOM Chatrooms: ");
                        console.log(chatrooms);
                        console.log("JOIN ROOM Users online: ");
                        console.log(users_online);
                       
                        
                    }
                    else {
                        socket.emit("success",{success:false,message:"wrong password."});

                    }

                
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
        }
        
        
        console.log("UPDATE FUNCTION CHATROOMS: ");
        console.log(chatrooms);
        console.log("UPDATE FUNCTION ALL USERS: ");
        console.log(users_online);
        

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
                        socketKicked.emit("kickSuccess",{success:true,message:"You have been kicked out of the chat."});
                        socket.emit("success",{success:true, message:"You have successfully kicked this user out of the chat."});

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
                    let socketBanned=io.sockets.sockets.get(bannedsocketID);
                    socketBanned.leave(currentRoom);
                    socketBanned.emit("banSuccess",{success:true,message:"You have been banned from the chat."});
                    socket.emit("success",{success:true, message:"You have successfully banned this user from the chat."});
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
        
    });

    socket.on("delete",function(data){
        //retrieve the current room
        let currentRoom=null;
        for(let i in users_online){
            if(users_online[i].id==socket.id){
                currentRoom=users_online[i].inRoom;
            }
        }
        let creator=null;
        //retrieve creator of current room
        for(let i in chatrooms){
            if(currentRoom==chatrooms[i].roomName){
                creator=chatrooms[i].creator;
            }
        }
        //check if socket has creator privileges
        if(socket.id==creator){
            //inform all users this chat has been deleted

            io.in(currentRoom).emit("deleted", {success:true, message:"This chat has been deleted"});
            //go through all the users in this room and set their inRoom to null
            for(let i in users_online){
                if(users_online[i].inRoom==currentRoom){
                    users_online[i].inRoom=null;
                    let eachSocket=io.sockets.sockets.get(users_online[i].id);
                    eachSocket.leave(currentRoom);
                }
            }
            //run thru the chat rooms array to remove it
            for (let i in chatrooms){
                if(chatrooms[i].roomName==currentRoom){
                    chatrooms.splice(i,1);
                }
            }
            console.log("DELETE FUNCTION CHATROOMS: ");
            console.log(chatrooms);
            io.sockets.emit("roomDeleted",{roomName:currentRoom});
        }
        else{
            socket.emit("success",{success:false, message: "Only creators of the chat can delete the chat."});
        }

    });

    //check if there are no users
    socket.on("checkRoomsEmpty",function(data){
        for (let i in chatrooms){
            if(chatrooms[i].usersInRoom.length==0){
                console.log("BEFORE users left: ");
                console.log(chatrooms);
                io.sockets.emit("roomDeleted",{roomName: chatrooms[i].roomName});
                chatrooms.splice(i,1);
                console.log("AFTER users left: ");
                console.log(chatrooms);
            }
        }
    });

    socket.on("change_creator", function(data){
        console.log("new creator: "+ data["newCreator"]);
        //retrieve current room
        let currentRoom=null;
        for(let i in users_online){
            if(users_online[i].id==socket.id){
                currentRoom=users_online[i].inRoom;
            }
        }
        console.log("current room : "+ currentRoom);
        //data["newCreator"]

        //if user exists in room
        let isUserIn =null;
        let currentcreator=null;
        for (let i in chatrooms) {
            for (let j in chatrooms[i].usersInRoom){
                if (chatrooms[i].usersInRoom[j]==data["newCreator"]){
                    isUserIn=true;
                    currentcreator = chatrooms[i].creator;
                }
            }
            
        }
        console.log("creator of room is " + currentcreator);
        let newCreatorid=null;
        if (isUserIn==true){
            //user exists in room so get id 
            for (let i in users_online) {
                if (users_online[i].nickname==data["newCreator"]){
                    newCreatorid=users_online[i].id;
                }
            }
            //if current user is creator then change 
            //let creator = null;
            if (currentcreator==socket.id) {
                for (let i in chatrooms){
                    if (chatrooms[i].roomName == currentRoom){
                        chatrooms[i].creator=newCreatorid;
                        console.log("updated room: "+ chatrooms[i].creator);
                    }
                }
                console.log("inside if loop: " );
                console.log( users_online);
                console.log(chatrooms);
                //new creator has privileges displayed
                let creatorID=io.sockets.sockets.get(newCreatorid);
                creatorID.emit("creator_privileges",{isCreator:true} );

                //update show room info for everyone in room 
                io.in(currentRoom).emit("in_chatroom", {room: currentRoom, creator:data["newCreator"]});

            }
            else {
                socket.emit("success",{success:false, message: "Only creators of the chat can reassign privileges."});
            }

        }
        else {
            socket.emit("success",{success:false, message:"user is not in room"});
        }

        
    });
    

   
    
  
});