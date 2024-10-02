const express = require('express')
const mysql = require('mysql2')
const bcrypt = require('bcryptjs')
const bodyParser = require('body-parser')
const cors = require('cors')
const session = require('express-session');

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

const app = express()
const port = 3000

// 跨域资源共享 (CORS) 配置，允许前端发起跨域请求
app.use(cors({
    origin: 'http://47.96.94.197:5173',  // 前端地址
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