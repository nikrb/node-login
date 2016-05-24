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
    logger.info("Workout Connected.");
    
    workouts = db.collection( 'workouts');
    drills = db.collection( 'drills');
});

exports.findAll = function( req, res){
    var user_id = req.session.user._id;
    logger.info( "@workout.findAll for user:", user_id);
    workouts.find( { owner : user_id }).toArray( function( err, workout_list){
        logger.trace( "found workout count:", workout_list.length);
        if( err || workout_list.length === 0){
            if( err){
                logger.error( "@Workout.findAll failed:", err);
                res.status(400).send( [{ error:true, message:err}]);
            } else {
                logger.warn( "@Workout.findAll found no workouts");
                res.status(200).send( [{error:true, message:{ msg:"no workouts found"}} ]);
            }
        } else {
            var promises = [];
            // return any drills that are not owned by the user or system (just in case)
            workout_list.forEach( function( workout, ndx, arr){
                logger.trace( "@workout.findAll getting drills for workout:", workout);
                if( typeof workout.hasDrills !== "undefined"){
                    var wd = workout.hasDrills.split(",");
                    var workout_drills = wd.map( function( ele){
                        return ObjectId( ele);
                    });
                    var owners = [ "system", req.session.user._id];
                    logger.trace( "finding drill list:", workout_drills);
                    logger.trace( "owner list:", owners);
                    
                    var np = new Promise( function( resolve, reject){
                        drills.find( {_id : { $in : workout_drills}, owner: { $nin : owners} } )
                                .toArray()
                        .then( function( unowned_drills){
                            logger.trace( "found unowned drills:", unowned_drills);
                            workout.drill_data = unowned_drills;
                            resolve( true);
                        });
                    });
                    promises.push( np);
                }
            });
        	Promise.all( promises).then( function( rubbish){
                logger.info( "@Workout.findAll results:", workout_list);
                res.status(200).send( workout_list);
            });
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    logger.info( "Workout.saveAll owner:", user_id);
    var workout_list = req.body;
    var promises = [];
    for( var i =0; i<workout_list.length; i++){
        var p = new Promise( function( resolve, reject){
            var workout = workout_list[i];
            logger.trace( "creating promise for workout:", workout);
            if( workout.mid.length){
                logger.trace( "replacing object with mid");
                workouts.findOneAndReplace( { _id : ObjectId( workout.mid)},
                        workout, { projection: { ios_id:1, _id:1}, 
                                returnOriginal:false, 
                                upsert:true}, 
                    function( err, result){
                        logger.trace( "dealing with workout:", result.value);
                    if( err){
                        resolve( { error:true, message:err});
                    } else {
                        resolve( result.value);
                    }
                });
            } else {
                logger.trace( "inserting object without mid");
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
	    logger.info( "@Workout.saveAll results:", results);
	    res.status(200).send( results);
	});
};


exports.purge = function( workout_mid_list){
    var mids = workout_mid_list.map( function( ele){
        return ObjectId( ele);
    });
    workouts.deleteMany( { _id : { $in : mids}}, {}, function( err, results){
        if( err){
            console.log( "@workout.purge failed:", err);
        } else {
            console.log( "@workout.purge count:", results.deletedCount);
        }
    });
};

