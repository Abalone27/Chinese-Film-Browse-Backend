const app = require("express")()
const mysql = require('mysql2')
const bcrypt = require('bcryptjs')
const bodyParser = require('body-parser')
const cors = require('cors')
const session = require('express-session');
const server = require('http').createServer(app)
const {Server} = require('socket.io')
const io = new Server(server, {
    cors: {
      origin: 'http://localhost:5173',  // 允许前端的地址
      methods: ['GET', 'POST'],  // 允许的HTTP方法
      credentials: true  // 允许凭证（如Cookies）
    }
  });
const {getFormattedDate} =require('./timetrans')
let clientCount = 0

const connection=mysql.createConnection({
    host:'localhost',
    user:'root',
    password:'Baoyu273511a',
    database:'film_db'
})

connection.connect(err=>{
    if(err) {
        console.error('连接失败',err)
        return
    }
    console.log('成功连接到数据库')
})

const port = 3000

// 跨域资源共享 (CORS) 配置，允许前端发起跨域请求
app.use(cors({
    origin: '*',  // 前端地址
    credentials: true,  // 允许携带 Cookie
    methods: ['GET', 'POST', 'OPTIONS'],  // 允许的请求方法
    allowedHeaders: ['Content-Type']  // 允许的请求头
}));

// 会话中间件
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,  // 使用 HTTPS 时设置为 true
        httpOnly: true,
        maxAge: 1000 * 60 * 60  // 1 小时
    }
}));



app.use(bodyParser.json())

app.options('*', (req, res) => {
    res.sendStatus(200);
});


// 注册路由接口
app.post('/register',async (req,res)=>{
    const {username,password} =req.body

    if(!username || !password) {
        return res.status(400).json({
            success:false,
            message:"用户名和密码不能为空"
        })
    }

    // 检查用户名是否已经存在
    const sql_finduser = 'SELECT * FROM users WHERE name = ?';
    connection.query(sql_finduser, [username], async (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: '服务器错误' });
    }

    if (results.length > 0) {
      // 用户名已存在
      return res.status(409).json({ success: false, message: '用户名已存在，请选择其他用户名' });
    }

    // 加密密码
    const hashedPassword=await bcrypt.hash(password,10)

    // 插入用户到数据库
    const sql_adduser = 'INSERT INTO users (name,password) VALUES (?,?)'
    connection.query(sql_adduser,[username,hashedPassword],(err,result)=>{
        if(err) {
            console.error('插入用户时发生错误: ',err)
            return res.status(500).json({success:false,message:'数据库错误'})
        }
        console.log('用户注册成功')
        return res.status(201).json({success:true,message:'注册成功'})
    })
    })
})

// 登陆路由接口
app.post('/login',(req,res)=>{
    const {username,password} =req.body
    
    // 查询用户
    const query = 'SELECT * FROM users WHERE name = ?'
    connection.query(query,[username],(err,results)=>{
        if(err) {
            return res.status(500).json({success:false,message:'服务器错误'})
        }
        if(results.length === 0) {
            return res.status(401).json({success:false,message:'用户名或密码不正确'})
        }

        const user = results[0]

        // 验证密码
        bcrypt.compare(password,user.password,(err,isMatch)=>{
            if(err) {
                return res.status(500).json({
                    success:false,
                    message:'服务器错误'
                })
            }
            if(!isMatch) {
                return res.status(401).json({
                    success:false,
                    message:'用户名或密码不正确'
                })
            }

            console.log('用户登陆成功')
            return res.json({success:true})
        })
        
    })

})

app.listen(port,()=>{
    console.log(`server running at:${port}`)
})

// Chat Room
io.on('connection',socket=>{

    console.log(`A user connected: ${socket.id}`);

    const usrname = `用户_${socket.id}`
    clientCount++

    // database操作
    connection.query('SELECT * FROM messages ORDER BY id ASC',(err,results)=>{
        if(err){
            console.log("查询聊天记录时出错："+err.stack)
            return
        }
        socket.emit('load previous messages',results)
        // 自己查看：发送在线人数
        socket.emit("show count",clientCount)
    })

    io.emit("login message",{msg:`${usrname}进入了聊天室！`,created_at: getFormattedDate()})
    // 发送在线人数
    io.emit("show count",clientCount)

    // 监听用户发送的消息保存到数据库并输出
    socket.on('chat message',data=>{
        // save message
        const query = 'INSERT INTO messages (msg,created_at,color) VALUES (?,?,?)'
        connection.query(query,[data.msg,data.created_at,data.color],(err,result)=>{
            if(err){
                console.error('保存聊天记录时出错'+err.stack)
                return
            }
            console.log('消息记录'+data.msg+"已保存到数据库")
        })

        io.emit('chat message',data)
    })
    socket.on('disconnect',()=>{
        io.emit("login message",{msg:"哎！有人离开了...",created_at:getFormattedDate()})
        clientCount--
        // 发送在线人数
        io.emit("show count",clientCount)
    })
})

server.listen(port+1,()=>`聊天室服务器开启：port${port}`)