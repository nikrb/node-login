// TODO: this isn't ideal I suspect
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var workouts;
var drills;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("WorkoutP Connected.");
    
    workouts = db.collection( 'workouts');
    drills = db.collection( 'drills');
});

exports.findWorkoutByMidWithDrills = function( workout_mid, owner){
    return new Promise( function( resolve, reject){
        console.log( "inside promise");
        workouts.find( { _id : ObjectId( workout_mid)})
        .toArray( function( err, workout_one){
            console.log( "found workouts:", workout_one);
            if( err){
                reject( err);
            } else {
                var workout = workout_one[0];
                var workout_drills = workout.hasDrills.split(",")
                .map( function( id){
                    console.log( "drill id:", id);
                    return ObjectId( id);
                });
                var owners = [ "system", owner];
                console.log( "finding drill list:", workout_drills);
                console.log( "owner list:", owners);
                drills.find( {_id : { $in : workout_drills} , owner: { $nin : owners} } )
                .toArray( function( err, unowned_drills){
                    if( err){
                        console.log( "@@routine.findWorkoutByMidWithDrills failed:", err);
                    } else {
                        workout.drill_data = unowned_drills;
                    }
                    console.log( "resolve with workout:", workout);
                    resolve( workout);
                });
            }
        });
    });
};