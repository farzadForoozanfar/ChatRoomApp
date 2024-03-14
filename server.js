const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');
const { setIpWithTTL, isIpExpired } = require('./utility/ip-map');

const formatMessage = require('./utility/messages');
const { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utility/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const bot = new TelegramBot('6931081448:AAFz0kXyNlWd6hcjCGNzLZCjO5IRv_A4HOE');

const botName = 'Admin';
const telegramResponseTpl = "نام و نام خانوادگی: $name\nشماره تماس: $mobile\nمتن پیام: $msg";

app.use(express.static(path.join(__dirname, 'public')));

app.get('/send-message', (req, res) => {
    const clientIp = req.ip;

    if (isIpExpired(clientIp)) {
        setIpWithTTL(clientIp);
        const chatId = "-1001936062958";
        const data = req.query;
        const message = telegramResponseTpl.replace('$name', data.name).replace('$mobile', data.mobile).replace('$msg', data.message);

        bot.sendMessage(chatId, message)
            .then(() => {
                res.send('Message sent successfully');
            })
            .catch((error) => {
                res.status(500).send('Error sending message: ' + error.message);
            });
    }
    
    res.send('Message sent successfully');
});

io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

        socket.emit('message', formatMessage(botName, `${username} welcome to chat`));
        socket.broadcast
            .to(user.room)
            .emit('message', formatMessage(botName, `${username} has joined the chat`));

        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        })
    });

    //Run when current client disconnect
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);
        if (user) {
            io.to(user['room']).emit('message', formatMessage(botName, `${user['username']} left chat`)); // notif to all user
        }

        io.to(user.room).emit('roomUsers', {
            room: user['room'],
            users: getRoomUsers(user['room'])
        });
    });

    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(socket.id);
        io.emit('message', formatMessage(user.username, msg));
    });

});

const PORT = 4000;

server.listen(PORT, () => console.log(`Server Start On Port ${PORT}`));
