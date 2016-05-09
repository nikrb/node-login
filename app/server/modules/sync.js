var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var workoutp = require('./workoutp');
var routines, workouts, drills, accounts, practices, outcomes;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Sync Connected.");
    
    accounts = db.collection('accounts');
    routines = db.collection( 'routines');
    workouts = db.collection( 'workouts');
    drills = db.collection( 'drills');
    practices = db.collection( "practices");
    outcomes = db.collection( "outcomes");
});

exports.retrieveRoutinesForTarget = function( req, res){
    var user_id = req.session.user._id;
    console.log( "@sync.retrieveRoutinesForTarget user:", user_id);
    
    routines.find( {owner : user_id, state:"requested"}).toArray()
    .then( function( routines_list){
        if( routines_list.length > 0){
            var promises = [];
            routines_list.forEach( function( routine, ndx, arr){
                console.log( "@sync.retrieveRoutinesForTarget routine:", routine);
                routine.state = "retrieved";
                routines.findOneAndUpdate( { _id: ObjectId( routine._id)}, { $set: { state:"retrieved"}})
                .then( function( updated_routine){
                    console.log( "@sync.retrieveRoutinesForTarget udpate routine state:", updated_routine);
                });
                var p = new Promise( function( resolve, reject){
                    workoutp.findWorkoutByMidWithDrills( routine.workout_mid, user_id)
                    .then( function( found_workout){
                        routine.workout_data = found_workout;
                        resolve( true);
                    });
                });
                promises.push( p);
                /* FIXME: remove unused
                workouts.find( { _id : ObjectId( routine.workout_mid)}).next( function( e, workout){
                    routine.workout = workout;
                    if( workout.hasDrills.length > 0){
                        var drill_ids = workout.hasDrills.split( ",")
                            .map( function( ele){
                                return ObjectId( ele);
                            });
                        console.log( "finding unowned drills with ids:", drill_ids);
                        var exclude_owners = [ "system", user_id];
                        drills.find( { owner : { $ne : exclude_owners},
                                        _id : {$in : drill_ids}})
                            .toArray( function( e, drill_list){
                            console.log( "found unowned drill count:", drill_list.length);
                            if( drill_list.length > 0){
                                routine.unowned_drills = drill_list;
                            }
                            if( ndx === arr.length-1) resolve( routines_list);
                        });
                    } else {
                        if( ndx === arr.length-1) resolve( routines_list);
                    }
                });
                */
            });
            Promise.all( promises).then( function( finished){
                console.log( "@sync.retrieveRoutinesForTarget results:", routines_list);
                res.status(200).send( routines_list);
            });
        } else {
            console.log( "@sync.retrieveRoutinesForTarget not found");
            res.send( [{ error : true, message : "not found"}]);
        }
    });
};

exports.sendCompletedRoutines = function( req, res){
    console.log( "@sync.sendCompletedRoutines user:", req.session.user._id);

    var routine_list = req.body["routines"];
    
    var p = new Promise( function( resolve, reject){
        routine_list.forEach( function( routine, ndx, arr){
            routines.findOneAndUpdate( { _id : ObjectId( routine.mid)},
                        { $set : { practice_mid : routine.practice_mid, 
                                    state : "returned",
                                    owner : routine.creator_mid
                        }})
            .then( function( updated_routine){
                if( ndx === arr.length -1){
                    resolve( true);
                }
            });
        });
    }).then( function( results){
        var data = routine_list.map( function( obj){
            return { ios_id : obj.ios_id };
        });
        console.log( "@sync.sendCompletedRoutines :", data);
        res.status(200).send( data);
    });
};

exports.createRoutinesForTargets = function( req, res){
    console.log( "@sync.createRoutinesForTargets user:", req.session.user._id);
    // var user_id = req.session.user._id;
    var routine_list = req.body[0]["routines"];
    var promises = [];
    for( var i=0; i<routine_list.length; i++){
        // this is a compound promise so wrap in a bespoke promise to get it working
        var acc = new Promise( function( resolve, reject){
            var routine = routine_list[i];
            console.log( "@sync.createRoutinesForTargets routine:", routine);
            accounts.find( {email:routine.target} ).toArray().then( function(results){
                if( results.length == 0){
                    resolve( { ios_id : routine.ios_id, 
                                                target : routine.target,
                                                error : "target player not registered"});
                } else {
                    var target_user = results[0];
                    if( routine.mid){
                        var target_mid = target_user._id.toHexString();
                        console.log( "updateing sync routine with mid, target:", target_mid);
                        routines.findOneAndUpdate( { _id : ObjectId( routine.mid)},
                                { $set : { owner : target_mid, state: "requested"}},
                                { projection: { ios_id:1, _id:1}, 
                                        returnOriginal:false, 
                                        upsert:false}, 
                            function( err, result){
                                if( err){
                                    resolve( { error:true, message:err});
                                } else {
                                    resolve( result.value);
                                }
                            }
                        );
                    } else {
                        console.log( "creating sync routine without mid");
                        routine.owner = target_user._id.toHexString();
                        routine.state = "requested";
                        routines.insertOne( routine).then( function( results){
                            if( results.insertedCount == 0){
                                console.log( "@sync.doit routine insert one failed:", routine.target);
                                resolve( { ios_id : obj.ios_id,
                                                            target : routine.target,
                                                            error : "insert failed"});
                            } else {
                                var obj = results.ops[0];
                                var newrou = { ios_id : obj.ios_id, _id : obj._id.toHexString()};
                                resolve( newrou);
                            }
                        });
                    }
                }
            });
        });
        promises.push( acc);
    }
    Promise.all( promises).then( function( results){
        var data = {};
        data["routines"] = [];
        for( var i=0; i< results.length; i++){
            if( typeof results[i] !== "undefined"){
                data["routines"].push( results[i]);
            }
        }
        console.log( "@sync.createRoutinesForTargets return data:", data);
        res.status(200).send( [data]);
    });
};


exports.getCompletedRoutines = function( req, res){
    console.log( "@sync.getCompletedRoutines user:", req.session.user._id);
    var user_id = req.session.user._id;
    
    routines.find( { creator_mid : user_id, state : "returned", owner : user_id}).toArray(function( e, routine_list){
        if( e){
            console.log( "@sync.getCompletedRoutines find routines failed:", e);
            res.send( [{error:true, message : e}]);
        } else if( routine_list.length > 0){
            var promises = [];
            routine_list.forEach( function( routine, ndx, arr){
                routine.state = "closed";
                routines.findOneAndUpdate( { _id: ObjectId( routine._id)}, { $set: { state:"closed"}})
                .then( function( updated_routine){
                    console.log( "@sync.getCompletedRoutines udpate routine state:", updated_routine);
                });
                var np = new Promise( function( resolve, reject){
                    practices.find( { _id : ObjectId( routine.practice_mid)}).next( function( e, prac){
                        if( e){
                            console.log( "@sync.getCompletedRoutines practice find failed:", e);
                            routine.error = { message : "practice not found"};
                            resolve( 1);
                        } else {
                            console.log( "@sync.getCompletedRoutines found practice:", prac);
                            routine.practice = prac;
                            var outcome_arr = prac.outcome_mids.split( ",");
                            var outcome_ids = outcome_arr.map( function( mid){
                                return ObjectId( mid);
                            });
                            outcomes.find( { _id : { $in : outcome_ids}}).toArray( function( e, outcome_list){
                                if( e){
                                    console.log( "@sync.getCompletedRoutines outcome find failed:", e);
                                    routine.error = { message : "outcomes not found" };
                                } else {
                                    routine.outcome_list = outcome_list;
                                }
                                resolve( 1);
                            });
                        }
                    });
                });
                promises.push( np);
            });
            Promise.all( promises).then( function( rubbish){
                // TODO: bulk update on routines - hmmm, can we delete them?
                console.log( "@sync.getCompletedRoutines completed routine list:", routine_list);
                res.status(200).send( routine_list);
            });
        } else {
            console.log( "@sync.getCompletedRoutines not found");
            res.send( []);
        }
    });
};

