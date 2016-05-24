// TODO: this isn't ideal I suspect
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var log4js = require('log4js'); 
var logger = log4js.getLogger('shoot');
var workouts;
var drills;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    logger.info("WorkoutP Connected.");
    
    workouts = db.collection( 'workouts');
    drills = db.collection( 'drills');
});

exports.findWorkoutByMidWithDrills = function( workout_mid, owner){
    logger.trace( "@workoutP.findWorkoutByMidWithDrills workout_mid[%s], owner[%s]", workout_mid, owner);
    return new Promise( function( resolve, reject){
        workouts.find( { _id : ObjectId( workout_mid)})
        .toArray( function( err, workout_one){
            if( err){
                reject( err);
            } else {
                if( workout_one.length == 1){
                    var workout = workout_one[0];
                    var workout_drills = workout.hasDrills.split(",")
                    .map( function( id){
                        return ObjectId( id);
                    });
                    var owners = [ "system", owner];
                    drills.find( {_id : { $in : workout_drills} , owner: { $nin : owners} } )
                    .toArray( function( err, unowned_drills){
                        if( err){
                            logger.error( "@routine.findWorkoutByMidWithDrills failed:", err);
                        } else {
                            workout.drill_data = unowned_drills;
                        }
                        resolve( workout);
                    });
                } else {
                    logger.trace( "@workoutp.findWorkoutByMidWithDrills workout not found:", workout_mid);
                    resolve( 0);
                }
            }
        });
    });
};