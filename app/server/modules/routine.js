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
    // var user_id = "56e79125168800421b87e5d7";
    console.log( "@routine.findAll user:", user_id);
    routines.find( { $or : [ {owner : user_id}, { creator_mid : user_id}]}).toArray( function( err, routine_list){
        if( err){
            console.log( "@Routine.findAll failed:", err);
            res.status(400).send( [{ error:true, message:err}]);
        } else if( routine_list.length === 0){
            console.log( "@Routine.findAll not found");
            res.status(200).send( [{ error:true, message:"not found"}]);
        } else {
            // always return routine to creator on load
            // if not creator, only return if owner has control
            // this boils down to states retrieved and complete.
            // states: created,requested,retrieved,complete,returned,closed
            // state requested means target hasn't retrived it yet, so don't return on load
            // state returned means target has passed routine back to coach, and is deleted
            // from target device so don't load.
            var results = routine_list.filter( function( routine){
                if( routine.creator_mid === user_id){
                    if( routine.state === "returned" || routine.state === "closed"){
                        routine.practice_data = true;
                    }
                    return true;
                } else {
                    // for target player, we (should) already have the practice data
                    if( routine.state === "retrieved" || routine.state === "complete"){
                        return true;
                    }
                }
                return false;
            });
            console.log( "filtered routine list count:", results.length);
            if( results.length > 0){
                var p = new Promise( function( resolve, reject){
                    results.forEach( function( routine, ndx, results_arr){
                        // we don't need the workout if we created it
                        if( routine.creator_mid === routine.owner){
                            // but we need target player pactice data depending on state
                            // set above
                            if( routine.practice_data){
                                // fetch practice/outcome
                                practicep.findPracticeByMidWithOutcomes( routine.practice_mid)
                                .then( function( practice_data){
                                    routine.practice_data = practice_data;
                                    if( ndx === results_arr.length -1){
                                        resolve( results_arr);
                                    }
                                });
                            } else {
                                if( ndx === results_arr.length -1){
                                    resolve( results_arr);
                                }
                            }
                        } else {
                            workoutp.findWorkoutByMidWithDrills( routine.workout_mid, user_id)
                            .then( function( found_workout){
                                routine.workout = found_workout;
                                if( ndx === results_arr.length -1){
                                    resolve( results_arr);
                                }
                            });
                        }
                    });
                });
                p.then( function( results){
                    console.log( "@Routine.findAll results:", results);
                    res.status(200).send( results);
                });
            } else {
                console.log( "no routines to return");
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
