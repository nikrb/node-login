var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var workoutp = require( './workoutp');
var practicep = require( './practicep');
var routines;
var workouts;
var drills;
var practices;
var outcomes;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Routine Connected.");
    
    routines = db.collection( 'routines');
    workouts = db.collection( "workouts");
    drills = db.collection( 'drills');
    practices = db.collection( 'practices');
    outcomes = db.collection( 'outcomes');
});

exports.findAll = function( req, res){
    var user_id = req.session.user._id;
    // var user_id = "56e4e3a466336cc80876aa48";
    console.log( "@routine.findAll user:", user_id);
    routines.find( { $or : [ {owner : user_id}, { creator_mid : user_id}]}).toArray( function( err, found_routines){
        if( err){
            console.log( "@Routine.findAll failed:", err);
            res.status(400).send( [{ error:true, message:err}]);
        } else if( found_routines.length === 0){
            console.log( "@Routine.findAll not found");
            res.status(200).send( [{ error:true, message:"not found"}]);
        } else {
            // always return routine to creator on load
            // but don't return the practice data unless state closed
            // sync sets state from returned to closed and we don't
            // want coach seeing results before performing a sync.
            // if not creator, only return if target player has control
            // this boils down to states retrieved and complete.
            // states: created,requested,retrieved,complete,returned,closed
            // state requested means target hasn't retrieved it yet, so don't return on load
            // state returned means target has passed routine back to coach, and is deleted
            // from target device so don't load.
            var results = found_routines.filter( function( routine){
                if( routine.creator_mid === user_id){
                    if( routine.state === "closed"){
                        routine.practice_data = true;
                    }
                    return true;
                } else {
                    // for target player, we (should) already have the practice data
                    // change - we won't now have the practice data, we only get practices
                    // that don't have their isForRoutine flag set to false in practice find
                    // TODO: if state is retrieved, there are no practices?!
                    if( routine.state === "retrieved" || routine.state === "complete"){
                        routine.practice_data = true;
                        return true;
                    }
                }
                return false;
            });
            console.log( "filtered routine list count:", results.length);
            if( results.length > 0){
                var promises = [];
                results.forEach( function( routine, ndx, results_arr){
                    // we don't need the workout if we created it
                    console.log( "deal with routine:", routine);
                    if( routine.creator_mid !== user_id){
                        var wp = new Promise( function( resolve, reject){
                            workoutp.findWorkoutByMidWithDrills( routine.workout_mid, user_id)
                            .then( function( found_workout){
                                routine.workout_data = found_workout;
                                resolve( true);
                            });
                        });
                        promises.push( wp);
                    }
                    
                    if( routine.practice_data && routine.practice_mid){
                        // fetch practice/outcome
                        var p = new Promise( function( resolve, reject){
                            practicep.findPracticeByMidWithOutcomes( routine.practice_mid)
                            .then( function( practice_data){
                                console.log( "got practice data:", practice_data);
                                routine.practice_data = practice_data;
                                resolve( true);
                            });
                        });
                        promises.push( p);
                    }
                });
                Promise.all( promises).then( function( rubbish){
                    console.log( "@Routine.findAll results:", found_routines);
                    res.status(200).send( found_routines);
                });
            } else {
                console.log( "@routine.findAll not found");
                res.status(200).send( [{ error:true, message:"not found"}]);
            }
        }
    });
};

exports.saveAll = function( req, res){
    // routines are mutabl
    var user_id = req.session.user._id;
    console.log( "@Routine.saveAll for owner:", user_id);
    var routine_list = req.body;
    var promises = [];
    routine_list.forEach( function( routine, ndx, routine_arr){
        var p = new Promise( function( resolve, reject){
            if( routine.mid.length){
                // creator won't send any routines here as sync only updates
                // state so doesn't need saving
                // target player can change state from retrieved to complete
                // without sync, so catch that here and not the (new) pratice mid
                console.log( "update routine mid[%s] state[%s] with practice mid[%s]", 
                                routine.mid, routine.state, routine.practice_mid);
                if( typeof routine.practice_mid === "undefined"){
                    routine.practice_mid = "";
                }
                routines.findOneAndUpdate( { _id : ObjectId(routine.mid) }, 
                    { $set : { practice_mid : routine.practice_mid, 
                                workout_mid : routine.workout_mid,
                                state : routine.state }},
                    { projection : { _id : 1, ios_id : 1}})
                .then( function( upd){
                    console.log( "routine updated:", upd.value);
                    resolve( { ios_id : routine.ios_id, 
                                _id : routine.mid});
                });
            } else {
                console.log( "insert routine without mid");
                // new routine so set owner
                routine.owner = user_id;
                routines.insertOne( routine, [], function( err, result){
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
    });
	Promise.all( promises).then( function( results){
	    console.log( "@Routine.saveAll results:", results);
	    res.status(200).send( results);
	});

};

exports.purge = function( routine_mid_list){
    var mids = routine_mid_list.map( function( ele){
        return ObjectId( ele);
    });
    routines.deleteMany( { _id : { $in : mids}}, {}, function( err, results){
        if( err){
            console.log( "@routine.purge failed:", err);
        } else {
            console.log( "@routine.purge count:", results.deletedCount);
        }
    });
};

