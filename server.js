const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const route = express.Router();

const jwt = require('jsonwebtoken');// used to create, sign, and verify tokens 
const config = require('./config');// get our config file
const User = require('./app/models/user');// get our mongoose model

//Configurations
const port = process.env.PORT || 3000;
mongoose.connect(config.database); // connect to database
app.set('superSecret', config.secret); // secret variable

// use body parser to so that we can get info from POST and/or URL parameters
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

// Routing
app.get('/', (req, res)=>{
    res.send('HEllo : the api is at http://localhost:' + port + '/api');
});

app.get('/setup', (req, res)=>{
    
    // create a sample user
    let nick = new User({
        name: 'Nick Canny',
        password: 'password',
        admin: true
    });

    // save the sample user
    nick.save(function(err){
        if (err) throw err;

        console.log('User saved successfully.');
        res.json({ succcess: true });
    });
});

// route to show some message
route.get('/', (req, res)=>{
    res.json({ message : 'Welcome the JWT based api ... ' });
});

// route to return all the users from the DB
route.get('/users', (req, res)=>{
    User.find({}, (err, users)=>{
        res.json(users);
    });
});

// route to authenticate the user
route.post('/authenticate', (req, res)=>{

    // find the user
    User.findOne({
        name: req.body.name
    }, (err, user)=>{
        if (err) throw err;
        if(!user) {
            res.json({ succcess: false, message: 'Authentication failed. User not found.' });
        } else if (user) {

            // check if password matches
            if (user.password != req.body.password) {
                res.json({ succcess: false, message: 'Authentication failed. Wrong Password.' });
            } else {
                
                // if user is found and password is right
                // create a token with only our given payload
                // we don't want to pass in the entire user since that has the password
                const payload = {
                    admin: user.admin
                };

                let token = jwt.sign(payload, app.get('superSecret'), {
                    expiresIn: 1440
                });

                // return the info including token as JSON
                res.json({
                    succcess: true,
                    message: 'Enjoy your token',
                    token: token
                });
            }
        }
    });
});

// route middleware to verify our tokens
route.use((req, res, next)=>{

    // check header or url parameters or post parameters for token
    let token = req.body.token || req.query.token || req.headers['x-access-token'];

    //decode token
    if (token) {
        
        // verifies secret and check exp
        jwt.verify(token, app.get('superSecret'), (err, decoded)=>{
            if (err) {
                return res.json({ succcess: false, message: 'Failed to authenticate token' });
            } else {
                //if everything is good, save to request for use in other routes
                req.decoded = decoded;
                next();
            }
        });
    } else {

        // if there is no token return error
        return res.status(403).send({ 
            succcess: false,
            message: 'No token provided.'
        });
    }
});

// redirecting the routing towards the /api
app.use('/api', route);

// Start  the server
app.listen(port);
console.log("Don't look at me look on the port : " + port );