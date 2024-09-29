const express = require('express')
const mysql = require('mysql2')
const bcrypt = require('bcryptjs')
const bodyParser = require('body-parser')
const cors = require('cors')
const jwt =require('jsonwebtoken')

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

app.use(cors())
app.use(bodyParser.json())

app.get('/',(req,res)=>{
    res.send('hello world')    
})

// 注册路由接口
app.post('/api/register',async (req,res)=>{
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
app.post('/api/login',(req,res)=>{
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

            // 创建JWT token
            const token = jwt.sign({
                id:user.id,
                username:user.name
            },'your_jwt_secret',{
                expiresIn:'1h'
            })

            console.log('用户登陆成功')
            return res.json({success:true,token})
        })
        
    })

    const authenticateToken = (req, res, next) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];  // 提取 Bearer Token
      
        if (!token) return res.sendStatus(401);  // 没有 token，返回 401 未授权
      
        jwt.verify(token, 'your_jwt_secret', (err, user) => {
          if (err) return res.sendStatus(403);  // token 无效，返回 403 禁止访问
          req.user = user;  // 将用户信息存储在 req 对象中
          next();  // 继续执行后续的请求处理
        });
      };
})

app.listen(port,()=>{
    console.log(`server running at:${port}`)
})