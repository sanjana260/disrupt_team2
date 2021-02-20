var express = require('express');
var app = express();
var mysql = require('mysql');
var bodyParser= require('body-parser');
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser');
var bcrypt= require('bcrypt');
const saltRounds = 10;

app.use(bodyParser.urlencoded({ extended: true })); 
app.use(express.json());
app.use(express.static('public'));
app.use('/js',express.static(__dirname + 'public/js'));
app.use('/css',express.static(__dirname + 'public/css'));
app.use('/public',express.static(__dirname + 'public'));
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

app.get('/',isLoggedIn, function(req, res){
    var number=0;
    if(req.user==false){var LoggedIn = false;}
    else{LoggedIn = true;}
    con.query(`SELECT * FROM cartitems WHERE UId = '${req.user}'`, function (err, result){
        if(err){throw err;}
        console.log(result);
        for(var i=0; i<3; i++)
        {
            if(typeof(result[i])!='undefined'&& result[i].Quantity!=0)
            {
                number++;
            }
        }
        res.render('home.ejs', {LoggedIn: LoggedIn, number: number});
    })
         
});

app.get('/addProduct/:Product/:Quantity', isLoggedIn, function(req,res){
    if(req.user==false){res.redirect('/login')}
    else{
        con.query(`SELECT * FROM cartitems WHERE UId = '${req.user}' AND Product = '${req.params.Product}'`, function (err, result) {
            if (err) {throw err};
            if(typeof(result[0])=='undefined'){
                con.query(`INSERT INTO cartitems (UId, Product, Quantity) VALUES ('${req.user}', '${req.params.Product}', '${req.params.Quantity}')`, function(err, result){
                    if(err){throw err;};
                    console.log('new cart item inserted');
                })}
            else{
                var quantity = parseInt(req.params.Quantity) + parseInt(result[0].Quantity);
                con.query(`UPDATE cartitems SET Quantity = '${quantity}' WHERE UId = '${req.user}' AND Product = '${req.params.Product}'`, function(err, result){
                    if(err){throw err};
                    console.log('cart quantity updated')
                })
            }
        });
        res.redirect('back')
    }
})

app.get('/delete/:Product', isLoggedIn, function(req,res){
    if(req.user==false){res.redirect('/login')}
    else{
        con.query(`DELETE FROM cartitems WHERE UId= '${req.user}' AND Product ='${req.params.Product}'`, function(err,result){
            if(err){throw err};
            console.log('Item deleted from cart');
        })
        res.redirect('/cart');
    }
})

app.get('/cart', isLoggedIn, function(req,res){
    var LoggedIn = false;
    if(req.user==false){res.redirect('/login')}
    else{
    LoggedIn = true;
    var quantity=[];
    var products=[];
    con.query(`SELECT * FROM cartitems WHERE UId = '${req.user}'`, function (err, result){
        for(var i=0; i<3; i++){
            if(typeof(result[i])!='undefined'&& result[i].Quantity!=0){
                products.push(result[i].Product);
                quantity.push(result[i].Quantity);
            }
        }
    res.render('cart.html', {LoggedIn: LoggedIn, products:products, quantity:quantity});
    }) 
}
})

app.get('/login',isLoggedIn, function(req, res){
    if(req.user){res.redirect('back')}
    res.render('login.ejs', {message: ''});
});

app.post('/login', function(req, res){
        var email= req.body.email;
        var password= req.body.password;
        con.query(`SELECT * FROM users WHERE email = '${email}'`, function (err, result) {
        if (err) {throw err};
        console.log(result);
        if(typeof(result[0])!='undefined'){
            bcrypt.compare(password, result[0].Password, function(err, correct) {
            if(correct==true){   
                var token=jwt.sign({id:result[0].Id}, "thisisthesecretkey", {
                    expiresIn: "30d",
                });
                res.cookie('accesstoken', token, { maxAge: 1000*60*60*24*30, httpOnly:true});
                res.redirect('/');
            }
            else{
                console.log('Email or password incorrect');
                console.log(password);
                console.log('bcrypt messed up')
                res.render('login.ejs', {message:'Email or password Incorrect'});
            }
        });
    }
    else{res.render('login.ejs', {message:'Email or password Incorrect'});}  
    }); 
})

app.get('/register',isLoggedIn, function(req, res){
    if(req.user!=false){res.redirect('back')}
    else{
    res.render("register.html", {message:null});}
});

app.post('/register', function(req, res){
    console.log('post request received');
    var email = req.body.email;
    var password = req.body.password;
    var cpassword = req.body.cpassword;
    console.log(email, password, cpassword)
    
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
                bcrypt.genSalt(saltRounds, function(err, salt) {
                    bcrypt.hash(password, salt, function(err, hash) {
                        var sql = `INSERT INTO users (Email, Password) VALUES ('${email}', '${hash}')`;
                        con.query(sql, function (err, result) {
                        if (err) throw err;
                            console.log("1 record inserted");
                        });
                        res.redirect('/');
                    });
                });

            }   
        })    
    }
})

app.get('/logout', function(req,res){
    res.cookie('accesstoken', '' , {maxAge: 1});
    res.redirect('/');
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