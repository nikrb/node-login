var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var workoutp = require( './workoutp');
var outcomep = require( './outcomep');
var log4js = require('log4js'); 
var logger = log4js.getLogger('shoot');
var practices, workouts, drills;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    logger.info("Practice onnected.");
    
    practices = db.collection( 'practices');
    workouts = db.collection( 'workouts');
    drills = db.collection( 'drills');
});

exports.findAll = function( req, res){
    var user_id = req.session.user._id;
    // var user_id = "56e4e3a466336cc80876aa48"; // "56e79125168800421b87e5d7";
    logger.info( "@practice.findAll user:", user_id);
    // we don't want practices for routines, we get those with routine
    practices.find( { owner: user_id, isForRoutine : "false" }).toArray( function(err, practice_list){
        if( err){
            logger.error( "@Practice.findAll failed:", err);
            res.status(400).send( err);
        } else if( practice_list.length) {
            // we need to return any unowned workouts/drills
            var promises = [];
            practice_list.forEach( function( practice, ndx, practice_arr){
                var p = new Promise( function( resolve, reject){
                    workoutp.findWorkoutByMidWithDrills( practice.workout_mid, user_id)
                    .then( function( workout){
                        if( workout === 0) {
                            logger.warn( "@practice.findAll find workout failed:", practice);
                            resolve(0);
                        } else {
                            practice.workout_data = workout;
                            outcomep.findByMidList( practice.outcome_mids)
                            .then( function( outcomes){
                                logger.trace( "@practice.findAll find outcome list:", outcomes);
                                practice.outcome_data = outcomes;
                                resolve( true);
                            });
                        }
                    });
                });
                promises.push( p);
            });
            Promise.all( promises).then( function( rubbish){
                logger.info( "@practice.findAll results:", practice_list);
                res.send( practice_list);
            });
        } else {
            logger.warn( "@practice.findAll not found");
            res.send( [{ error:true, message:"not found"}]);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    logger.info( "@Practice.saveAll owner:", user_id);
    var practice_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    // we only save new practices
    practices.insertMany( practice_list, [], function( err, objs){
        if( err){
            logger.error( "@Practice.saveAll error:", err);
            res.status(400).send( err);
        } else {
            var results = objs.ops.map( function( obj){
                return { ios_id:obj.ios_id, _id:obj._id.toHexString()};
            });
            logger.info( "@Practice.saveAll results:", results);
            res.status(200).send( results);
        }
    });
};

exports.purge = function( practice_mid_list){
    var mids = practice_mid_list.map( function( ele){
        return ObjectId( ele);
    });
    practices.deleteMany( { _id : { $in : mids}}, {}, function( err, results){
        if( err){
            logger.error( "@practice.purge failed:", err);
        } else {
            logger.info( "@practice.purge count:", results.deletedCount);
        }
    });
};

