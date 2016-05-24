
/**
	* Node.js Login Boilerplate
	* More Info : http://kitchen.braitsch.io/building-a-login-system-in-node-js-and-mongodb/
	* Copyright (c) 2013-2016 Stephen Braitsch
**/

var http = require('http');
var express = require('express');
var session = require('express-session');
var bodyParser = require('body-parser');
var errorHandler = require('errorhandler');
var cookieParser = require('cookie-parser');
var MongoStore = require('connect-mongo')(session);
var log4js = require('log4js'); 
//console log is loaded by default, so you won't normally need to do this
//log4js.loadAppender('console');
log4js.loadAppender('file');
//log4js.addAppender(log4js.appenders.console());
log4js.addAppender(log4js.appenders.file('logs/shoot.log'), 'shoot');

var logger = log4js.getLogger('shoot');
logger.setLevel('TRACE');


function uniqid(a){
	return a?(a^Math.random()*16>>a/4).toString(16):([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g,uniqid);
}

var app = express();

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/app/server/views');
app.set('view engine', 'jade');
app.use(cookieParser());
app.use(session({
	// secret: 'faeb4453e5d14fe6f6d04637f78077c76c73d1b4',
	secret: uniqid(),
	proxy: true,
	resave: true,
	saveUninitialized: true,
	store: new MongoStore({ host: 'localhost', port: 27017, db: 'node-login'})
	})
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('stylus').middleware({ src: __dirname + '/app/public' }));
app.use(express.static(__dirname + '/app/public'));

require('./app/server/routes')(app);

if (app.get('env') == 'development') app.use(errorHandler());

http.createServer(app).listen(app.get('port'), function(){
	logger.info('Express server listening on port ' + app.get('port'));
});
