var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var workouts;
var accounts;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("workout Connected.");
    
    workouts = db.collection( 'workouts');
    accounts = db.collection( 'accounts');
    // db.close();
});

exports.findAll = function( callback){
	workouts.find().toArray( function(e, res) {
		if( e){
		    callback(e);
		} else {
		    var promises = [];
		    for( var i=0; i<res.length; i++){
		        var workout = res[i];
		        var p = new Promise( function( resolve, reject){
                    accounts.find( { _id : ObjectId( workout.owner)}).limit(1).next( function( acc_err, workout_owner){
                        if( acc_err){
                            workout.owner_name = "not found";
                            resolve( workout);
                        } else {
                            workout.owner_name = workout_owner.name;
                            resolve( workout);
                        }
                    });
		        });
		        promises.push(p);
		    }
		    
    		Promise.all( promises).then( function( results){
    		    callback( null, results);
    		});
		}
	});
};

