var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var routines;
var accounts;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("workout Connected.");
    
    routines = db.collection( 'routines');
    accounts = db.collection( 'accounts');
    // db.close();
});

exports.findAll = function( callback){
	routines.find().toArray( function(e, routine_list) {
		if( e){
		    callback(e);
		} else {
		    var promises = [];
		    for( var i=0; i<routine_list.length; i++){
		        var p = new Promise( function( resolve, reject){
		            var routine = routine_list[i];
                    accounts.find( { email : routine.creator}).limit(1).next( function( acc_err, routine_creator) {
                        if( acc_err){
                            routine.creator_name = "not found";
                            resolve( routine);
                        } else {
                            if( routine_creator )
                            routine.creator_name = routine_creator.name;
                            accounts.find( {email : routine.target} ).limit(1).next( function( tgt_err, routine_target){
                                if( tgt_err){
                                    routine.target_name = "not found";
                                    resolve( routine);
                                } else {
                                    routine.target_name = routine_target.name;
                                    resolve( routine);
                                }
                            });
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

