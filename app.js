var express = require('express');
var app = express();
var mysql = require('mysql');
var bodyParser= require('body-parser');
const session = require('express-session');
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser');

app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.json());
app.use(express.static('public'));
app.use('/js',express.static(__dirname + 'public/js'));
app.set('views', './views');
app.use(cookieParser());

app.set('view-engine', 'ejs');
app.engine('html', require('ejs').renderFile);

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "nodejs"
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
    
  });

app.get('/', isLoggedIn, function(req, res){
    if(req.user==false){res.redirect('/login')}
    else{
        userId= req.user;
        con.query(`SELECT * FROM users WHERE Id = '${userId}'`, function (err, result) {
        if (err) {throw err};
        console.log(result);
        res.send('This is the home page. Welcome '+ result[0].username);
    });
    } 
});

app.get('/login',isLoggedIn, function(req, res){
    if(req.user){res.redirect('/')}
    res.render('login.ejs', {message: ''});
});

app.post('/login', function(req, res){
        var email= req.body.email;
        var password= req.body.password;
        con.query(`SELECT * FROM users WHERE email = '${email}'`, function (err, result) {
        if (err) {throw err};
        console.log(result);
        if(result[0].Password== password)
        {
            var token=jwt.sign({id:result[0].Id}, "thisisthesecretkey", {
                expiresIn: "30d",
            });
            res.cookie('accesstoken', token, { maxAge: 1000*60*60*24*30, httpOnly:true});
            res.redirect('/');
        }
        else{
            console.log('Email or password incorrect');
            console.log(password);
            res.render('login.ejs', {message:'Email or password Incorrect'});
        }
    }); 
})

app.get('/cart', isLoggedIn, function(req,res){
    if(req.user==false){res.redirect('/login')}
    else{
    res.render('cart.html', {products:['1','3','4']});}
})

app.get('/register',isLoggedIn, function(req, res){
    if(req.user!=false){res.redirect('/')}
    else{
    res.render("register.html", {message:null});}
});

app.post('/register', function(req, res){
    var email = req.body.email;
    var password = req.body.password;
    var cpassword = req.body.cpassword;
    var username= req.body.username;

    if (password !== cpassword){
        var message = 'the passwords are not matching!!';
        res.render('register.html', {message: message});
    } else {
        con.query(`SELECT * FROM users WHERE email = '${email}'`, function (err, result) {
            if (err) {throw err};
            console.log(result)
            if(typeof(result[0])!='undefined'){res.render('register.html', {message: 'user already exists with this email id'})
            console.log(result)}
            else{
                var sql = `INSERT INTO users (Email, Password, Username) VALUES ('${email}', '${password}', '${username}')`;
                con.query(sql, function (err, result) {
                if (err) throw err;
                    console.log("1 record inserted");
                });
                res.redirect('/');
            }   
        })    
    }
})

function isLoggedIn(req, res, next){
    var cookie = req.cookies;
    if(cookie){
        var token = cookie.accesstoken;
        jwt.verify(token, "thisisthesecretkey", (err,decoded)=>{
            if(err){
                req.user=false;
            }
            else{
                req.user = decoded.id;
            }
        });
    }
    else{
        req.user=false;
    }
    next();
}

app.listen(3000, function(){
    console.log('the server has started');
});