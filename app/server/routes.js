
var CT = require('./modules/country-list');
var AM = require('./modules/account-manager');
var EM = require('./modules/email-dispatcher');
var game = require('./modules/game.js');
var shot = require('./modules/shot.js');
var player = require('./modules/player.js');
var sync = require( './modules/sync.js');
var drill = require( './modules/drill.js');

module.exports = function(app) {
	
	app.get( '/drills', function(req, res) {
	    drill.findAll( req, res);
	});
	
	app.post( '/sync', function(req, res) {
	    sync.doit( req, res);
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

// main login page //
	app.get('/', function(req, res){
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
					res.send( [{login:true, user:o.user, email:o.email}]);
					console.log( "auto login success for [%s]", o.user);
				}	else{
					// res.render('login', { title: 'Hello - Please Login To Your Account' });
					res.send( [{login:false}]);
				}
			});
		}
	});
	
	app.post('/', function(req, res){
		AM.manualLogin(req.body['user'], req.body['pass'], function(e, o){
			if (!o){
				console.log( "login failed for [%s]", o.user);
				res.status(400).send(e);
			}	else{
				req.session.user = o;
				if (req.body['remember-me'] == 'true'){
					res.cookie('user', o.user, { maxAge: 900000 });
					res.cookie('pass', o.pass, { maxAge: 900000 });
				}
				console.log( "login post request success for [%s]", o.user);
				res.status(200).send( [{login:true, user:o.user, email:o.email}]);
			}
		});
	});
	

	app.post('/logout', function(req, res){
		console.log( "post /logout:");
		res.clearCookie('user');
		res.clearCookie('pass');
		req.session.destroy(function(e){ res.status(200).send( [{logout:true}]); });
	});
	
// creating new accounts //
	
	app.put('/signup', function(req, res){
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

// password reset //

	app.post('/lost-password', function(req, res){
	// look up the user's account via their email //
		AM.getAccountByEmail(req.body['email'], function(o){
			if (o){
				EM.dispatchResetPasswordLink(o, function(e, m){
				// this callback takes a moment to return //
				// TODO add an ajax loader to give user feedback //
					if (!e){
						res.status(200).send('ok');
					}	else{
						for ( var k in e) console.log('ERROR : ', k, e[k]);
						res.status(400).send('unable to dispatch password reset');
					}
				});
			}	else{
				res.status(400).send('email-not-found');
			}
		});
	});

	// reset password
	app.get('/reset-password', function(req, res) {
		var email = req.query["e"];
		var passH = req.query["p"];
		AM.validateResetLink(email, passH, function(e){
			if (e != 'ok'){
				res.redirect('/');
			} else{
	// save the user's email in a session instead of sending to the client //
				req.session.reset = { email:email, passHash:passH };
				res.render('reset', { title : 'Reset Password' });
			}
		});
	});
	
	app.post('/reset-password', function(req, res) {
		var nPass = req.body['pass'];
	// retrieve the user's email from the session to lookup their account and reset password //
		var email = req.session.reset.email;
	// destory the session immediately after retrieving the stored email //
		req.session.destroy();
		AM.updatePassword(email, nPass, function(e, o){
			if (o){
				res.status(200).send('ok');
			}	else{
				res.status(400).send('unable to update password');
			}
		});
	});
	
// view & delete accounts //
	
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
