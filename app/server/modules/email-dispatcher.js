var nodemailer = require('nodemailer');
var mailgun = require( 'nodemailer-mailgun-transport');

var EM = {};
module.exports = EM;

var auth = { auth : {
	api_key: "key-d3b5ebd3de3bc836cd26cb16fad5ceb0",
	domain: "sandboxbe6f5075f95b48d9afb230da0e2cdaf9.mailgun.org"
}};
var transporter = nodemailer.createTransport( mailgun( auth));

EM.dispatchResetPasswordLink = function(account, callback){
	var mail_options = {
		from: "180-Shooter <do-not-reply@shooter.com>",
		to: account.email,
		subject : "Password Reset",
		html: composeEmail( account)
	};
	
	transporter.sendMail( mail_options, function(error, info){
	    if(error){
	        return console.log(error);
	    }
	    console.log('Message sent: ', info);
	    if( callback){
	    	callback( null, true);
	    }
	});
};

function composeEmail(o){
	var link = 'https://node-browser-knik.c9users.io/reset-password?e='+o.email+'&p='+o.pass;
	var html = "Hi "+o.name+",<br><br>";
		html += "Your username is <b>"+o.user+"</b><br><br>";
		html += "<a href='"+link+"'>Click here to reset your password</a><br><br>";
		html += "Cheers,<br>";
	return  html;
}

