const express = require('express');

const app = express();

const http = require('http');
const path = require('path');
const server = http.createServer(app);
const { Server } = require('socket.io');
const { generateMessage } = require('./utils/messages');
const { addUser, getUsersInRoom, getUser, removeUser } = require('./utils/users');
const io = new Server(server);


io.on('connection', (socket) => {
    console.log('socket', socket.id);

    //#region Join
    socket.on('join', (options, callback) => {

        const { error, user } = addUser({ id: socket.id, ...options })

        if (error) {
            return callback(error);
        }

        socket.join(user.room);

        //socket.broadcast.to("룸") : 나를 제외한 방에있는 모든사람들에게
        socket.emit('message', generateMessage('Admin', `${user.room} 방에 오신 걸 환영합니다.`))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username}가 방에 참여했습니다.`))

        //io.to("룸").emit : 방에있는 모든사람들에게
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
    })
    //#endregion

    //#region Message
    socket.on('sendMessage', (message, callback) => {

        const user = getUser(socket.id);

        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback();
    })
    //#endregion

    //#region Disconnect
    socket.on('disconnect', () => {
        console.log('socket disconnected', socket.id)
        const user = removeUser(socket.id);

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username}가 방을 나갔습니다.`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
    //#endregion
})



const publicDirectoryPath = path.join(__dirname, '../public');
app.use(express.static(publicDirectoryPath));

const port = 4000;
server.listen(port, () => {
    console.log(`Server is up on port ${port}`);
}) 