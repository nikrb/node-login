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

exports.findAll = function( req, res){
    workouts.find( { owner : req.session.user._id}).toArray( function( err, workout_list){
        if( err){
            console.log( "@Workout.findAll failed:", err);
            res.status(400).send( [{ error:true, message:err}]);
        } else {
            console.log( "@Workout.findAll results:", workout_list);
            res.status(200).send( workout_list);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    console.log( "Workout.saveAll owner:", user_id);
    var workout_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    var promises = [];
    for( var i =0; i<workout_list.length; i++){
        var p = new Promise( function( resolve, reject){
            var workout = workout_list[i];
            console.log( "creating promise for workout:", workout);
            if( workout.mid.length){
                console.log( "replacing object with mid");
                workouts.findOneAndReplace( { _id : ObjectId( workout.mid)},
                        workout, { projection: { ios_id:1, _id:1}, 
                                returnOriginal:false, 
                                upsert:true}, 
                    function( err, result){
                        console.log( "dealing with workout:", result.value);
                    if( err){
                        resolve( { error:true, message:err});
                    } else {
                        resolve( result.value);
                    }
                });
            } else {
                console.log( "inserting object without mid");
                workouts.insertOne( workout, [], function( err, result){
                    if( err){
                        resolve( { error:true, message:err});
                    } else {
                        resolve( { ios_id : result.ops[0].ios_id, 
                                    _id:result.ops[0]._id});
                    }
                });
            }
        });
        promises.push( p);
    }
	Promise.all( promises).then( function( results){
	    console.log( "@Workout.saveAll results:", results);
	    res.status(200).send( results);
	});
};
