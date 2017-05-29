var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var PORT = 3000;
var users_in_room = [];
var users_is_pressing = [];

app.use(express.static("./public"));
app.set("view engine", "ejs");
app.set("views", "./views");

app.get(["/", "/login"], function(req, res){
    const failCode = req.query.fail;
    if(failCode == 1){
        res.render("login", {error : "Username is existing in room, please choose others."});
    }
    res.render("login");
});

app.get('/home/:username', function(req, res){
    const username = req.params.username;
    if(users_in_room.indexOf(username) >= 0){
        res.redirect("/login?fail=" + 1);
    }
    else{
        users_in_room.push(username);
        res.render("home", {
            user : {
                name : username
            }
        });
    }
});

http.listen(PORT, function(e){
    console.log("Server is running at port " + PORT);
});

io.on("connection", function(socket){
    console.log("[LOG] - new socket is connected : " + socket.id);

    socket.on("disconnect", function(){
        let _index = users_in_room.indexOf(socket.user.name);
        users_in_room.splice(_index, 1);
        socket.broadcast.emit("show_message_user_out", socket.user);
        socket.broadcast.emit("send_all_users_in_room", users_in_room);

        _index = users_is_pressing.indexOf(socket.user.name);
        if(_index >= 0){
            users_is_pressing.splice(_index, 1);
        }
        io.sockets.emit("user_is_pressing", users_is_pressing);
    });

    socket.on("send_user_info", function(user){
        console.log("[LOG] - socket sent info : " + user.name);
        
        socket.user = user;    //naming for socket

        //emit to all socket expect itself
        socket.broadcast.emit("show_message_new_user_join", user);
        io.sockets.emit("send_all_users_in_room", users_in_room);
    });

    //get message from socket sent to server
    socket.on("send_chat_message", function(_message){
        console.log("[LOG] - socket sent message : " + _message);

        //send message to all users in room
        io.sockets.emit("send_chat_message", {
            user : socket.user,
            message : _message
        });

        const _index = users_is_pressing.indexOf(socket.user.name);
        if(_index >= 0){
            users_is_pressing.splice(_index, 1);
        }
        io.sockets.emit("user_is_pressing", users_is_pressing);
    });

    //get status of press key from user
    socket.on("user_is_pressing", function(result){
        if(result == true && users_is_pressing.indexOf(socket.user.name) == -1){
            console.log("[LOG] - " + socket.user.name + " is pressing ....");
            users_is_pressing.push(socket.user.name);
        }
        const _index = users_is_pressing.indexOf(socket.user.name);
        if(result == false && _index >= 0){
            users_is_pressing.splice(_index, 1);
        }
        io.sockets.emit("user_is_pressing", users_is_pressing);
    });

});


