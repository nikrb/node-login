
var CT = require('./modules/country-list');
var AM = require('./modules/account-manager');
var EM = require('./modules/email-dispatcher');
var game = require('./modules/game.js');
var shot = require('./modules/shot.js');
var player = require('./modules/player.js');
var sync = require( './modules/sync.js');
var workout = require( './modules/workout.js');
var drill = require( './modules/drill.js');
var routine = require( './modules/routine.js');

module.exports = function(app) {
	
	app.get( '/drills', function(req, res) {
	    drill.findAll( req, res);
	});
	
	app.post( '/drills', function( req, res){
		drill.create( req, res);
	});
	
	app.post( '/synccre', function(req, res) {
	    sync.createRoutinesForTargets( req, res);
	});
	
	app.get( '/syncret', function(req, res) {
	    sync.retrieveRoutinesForTarget( req, res);
	});
	
	app.post( '/syncrou', function( req, res){
		sync.sendCompletedRoutines( req, res);
	});
	
	app.get( '/synccom', function( req, res){
		sync.getCompletedRoutines( req, res);
	});
	
	app.post( '/shots', function( req, res){
		shot.saveAll( req, res);
	});
	
	app.post( '/players', function(req, res) {
	    player.saveAll( req, res);
	});
	
	app.post( '/games', function( req, res){
		game.saveAll( req, res);
	});
	
	app.get( "/manual", function( req, res){
		switch( req.query.page){
			case 'step':
				res.render( "manual/step");
				break;
			case 'playertut':
				res.render( "manual/playertut");
				break;
			default:
				res.render( "manual/index");
				break;
		}
	});

	// json main login page //
	app.get('/gollum', function(req, res){
		// check if the user's credentials are saved in a cookie //
		if (req.cookies.user == undefined || req.cookies.pass == undefined){
			// res.render('login', { title: 'Hello - Please Login To Your Account' });
			res.send( [{login:false}]);
		}	else{
		// attempt automatic login //
			AM.autoLogin(req.cookies.user, req.cookies.pass, function(o){
				if (o != null){
				    req.session.user = o;
					// res.redirect('/home');
					res.send( [{login:true, user:o.user, email:o.email, mid:o._id.toHexString()}]);
					console.log( "auto login success for [%s]", o.user);
				}	else{
					// res.render('login', { title: 'Hello - Please Login To Your Account' });
					res.send( [{login:false}]);
				}
			});
		}
	});
	
	app.post('/gollum', function(req, res){
		AM.manualLogin(req.body['user'], req.body['pass'], function(e, o){
			if (!o){
				console.log( "login failed for [%s]", req.body['user']);
				res.status(400).send(e);
			}	else{
				req.session.user = o;
				if (req.body['remember-me'] == 'true'){
					res.cookie('user', o.user, { maxAge: 900000 });
					res.cookie('pass', o.pass, { maxAge: 900000 });
				}
				console.log( "login post request success for [%s]", o.user);
				res.status(200).send( [{login:true, user:o.user, email:o.email, mid:o._id.toHexString()}]);
			}
		});
	});
	

	app.post('/gollumout', function(req, res){
		console.log( "post /logout:");
		res.clearCookie('user');
		res.clearCookie('pass');
		req.session.destroy(function(e){ res.status(200).send( [{logout:true}]); });
	});
	
// creating new accounts //
	
	app.post('/gollumsignup', function(req, res){
		AM.addNewAccount({
			name 	: req.body['name'],
			email 	: req.body['email'],
			user 	: req.body['user'],
			pass	: req.body['pass']
			// country : req.body['country']
		}, function(e){
			if (e){
				console.log( "signup failed for email:", req.body['email']);
				res.status(400).send( e);
			}	else{
				console.log( "signup success for email:", req.body['email']);
				res.status(200).send( [{signup:true}]);
			}
		});
	});


	//**************************************************************************** browser site
	
	app.get('/', function(req, res){
		// check if the user's credentials are saved in a cookie //
		if (req.cookies.user == undefined || req.cookies.pass == undefined){
			res.render('login', { title: 'Hello - Please Login To Your Account' });
		}	else{
		// attempt automatic login //
			AM.autoLogin(req.cookies.user, req.cookies.pass, function(o){
				if (o != null){
				    req.session.user = o;
					res.redirect('/home');
				}	else{
					res.render('login', { title: 'Hello - Please Login To Your Account' });
				}
			});
		}
	});
	
	app.post('/', function(req, res){
		AM.manualLogin(req.body['user'], req.body['pass'], function(e, o){
			if (!o){
				res.status(400).send(e);
			}	else{
				req.session.user = o;
				if (req.body['remember-me'] == 'true'){
					res.cookie('user', o.user, { maxAge: 900000 });
					res.cookie('pass', o.pass, { maxAge: 900000 });
				}
				res.status(200).send(o);
			}
		});
	});

	app.post('/logout', function(req, res){
		console.log( "post /logout:");
		res.clearCookie('user');
		res.clearCookie('pass');
		req.session.destroy(function(e){ res.status(200).send('ok'); });
	});
	
	
	app.get('/home', function(req, res) {
		if (req.session.user == null){
	// if user is not logged-in redirect back to login page //
			res.redirect('/');
		}	else{
			res.render('home', {
				title : 'Control Panel',
				countries : CT,
				udata : req.session.user
			});
		}
	});
	
	app.post('/home', function(req, res){
		if (req.session.user == null){
			res.redirect('/');
		}	else{
			AM.updateAccount({
				id		: req.session.user._id,
				name	: req.body['name'],
				email	: req.body['email'],
				pass	: req.body['pass'],
				country	: req.body['country']
			}, function(e, o){
				if (e){
					res.status(400).send('error-updating-account');
				}	else{
					req.session.user = o;
					// update the user's login cookies if they exists //
					if (req.cookies.user != undefined && req.cookies.pass != undefined){
						res.cookie('user', o.user, { maxAge: 900000 });
						res.cookie('pass', o.pass, { maxAge: 900000 });	
					}
					res.status(200).send('ok');
				}
			});
		}
	});
	
	app.get('/signup', function(req, res) {
		res.render('signup', {  title: 'Signup', countries : CT });
	});
	
	app.post('/signup', function(req, res){
		AM.addNewAccount({
			name 	: req.body['name'],
			email 	: req.body['email'],
			user 	: req.body['user'],
			pass	: req.body['pass'],
			country : req.body['country']
		}, function(e){
			if (e){
				res.status(400).send(e);
			}	else{
				res.status(200).send('ok');
			}
		});
	});
	
	// view & delete accounts //
	app.get( '/test/workout', function(req,res){
		workout.findAll( function( e, workouts){
			res.render( 'workouts', { title : 'Workout List', list : workouts});
		});
	});
	app.get( '/test/routine', function( req, res){
		routine.findAll( function( e, routines){
			res.render( "routines", { list : routines});
		});
	});
	
	app.get('/print', function(req, res) {
		AM.getAllRecords( function(e, accounts){
			res.render('print', { title : 'Account List', accts : accounts });
		});
	});
	
	app.post('/delete', function(req, res){
		AM.deleteAccount(req.body.id, function(e, obj){
			if (!e){
				res.clearCookie('user');
				res.clearCookie('pass');
				req.session.destroy(function(e){ res.status(200).send('ok'); });
			}	else{
				res.status(400).send('record not found');
			}
	    });
	});
	
	app.get('/reset', function(req, res) {
		AM.delAllRecords(function(){
			res.redirect('/print');	
		});
	});
	
	app.get('*', function(req, res) {
		// res.render('404', { title: 'Page Not Found'}); 
		res.status(404).send( [{message:"Page Not Found"}]);
	});
};
