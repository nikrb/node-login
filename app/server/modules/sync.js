var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
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
    console.log( "@retrieveRoutinesForTarget :", req.body);
    var user_id = req.session.user._id;
    
    var rp = new Promise( function( resolve, reject){
        routines.find( {owner : ObjectId( user_id), state:"requested"}).toArray()
        .then( function( routines_list){
            if( routines_list.length > 0){
                routines_list.forEach( function( routine, ndx, arr){
                    console.log( "@sync.retrieveRoutinesForTarget routine:", routine);
                    routine.state = "retrieved";
                    routines.findOneAndUpdate( { _id: ObjectId( routine._id)}, { $set: { state:"retrieved"}})
                    .then( function( updated_routine){
                        console.log( "@sync.retrieveRoutinesForTarget udpate routine state:", updated_routine);
                    });
                    workouts.find( { _id : ObjectId( routine.workout_mid)}).next( function( e, workout){
                        routine.workout = workout;
                        if( workout.hasDrills.length > 0){
                            var drill_ids = workout.hasDrills.split( ",");
                            drills.find( { owner : { $ne : "system"},
                                            _id : {$in : drill_ids}
                                        }).toArray( function( e, drill_list){
                                if( drill_list.length > 0){
                                    routine.drills = drill_list;
                                }
                                if( ndx === arr.length-1) resolve( routines_list);
                            });
                        } else {
                            if( ndx === arr.length-1) resolve( routines_list);
                        }
                    });
                });
            } else {
                resolve( []);
            }
        });
    }).then( function( results){
        console.log( "@sync.retrieveRoutinesForTarget results:", results);
        res.status(200).send( results);
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
    var data = {};
    var body = req.body[0];
    var promises = [];
    for( var i=0; i<body["routines"].length; i++){
        // this is a compound promise so wrap in a bespoke promise to get it working
        var acc = new Promise( function( resolve, reject){
            var routine = body["routines"][i];
            console.log( "@sync.createRoutinesForTargets routine:", routine);
            accounts.find( {email:routine.target} ).toArray().then( function(results){
                if( results.length == 0){
                    resolve( { ios_id : routine.ios_id, 
                                                target : routine.target,
                                                error : "target player not registered"});
                } else {
                    var target_user = results[0];
                    routine.owner = target_user._id;
                    routine.state = "requested";
                    routines.insertOne( routine).then( function( results){
                        if( results.insertedCount == 0){
                            console.log( "@sync.doit routine insert one failed:", routine.target);
                            resolve( { ios_id : obj.ios_id,
                                                        target : routine.target,
                                                        error : "insert failed"});
                        } else {
                            var obj = results.ops[0];
                            var newrou = { ios_id : obj.ios_id, mid : obj._id.toHexString()};
                            resolve( newrou);
                        }
                    });
                }
            });
        });
        promises.push( acc);
    }
    Promise.all( promises).then( function( results){
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
    
    var promise = new Promise( function( resolve, reject){
        // FIXME: handle errors
        routines.find( { creator_mid : user_id, state : "returned", owner : user_id}).toArray(function( e, routine_list){
            if( routine_list.length > 0){
                routine_list.forEach( function( routine, ndx, arr){
                    routine.state = "closed";
                    routines.findOneAndUpdate( { _id: ObjectId( routine._id)}, { $set: { state:"closed"}})
                    .then( function( updated_routine){
                        console.log( "@sync.getCompletedRoutines udpate routine state:", updated_routine);
                    });
                    practices.find( { _id : ObjectId( routine.practice_mid)}).next( function( e, prac){
                        console.log( "@sync.getCompletedRoutines found practice:", prac);
                        routine.practice = prac;
                        var outcome_arr = prac.outcome_mids.split( ",");
                        var outcome_ids = outcome_arr.map( function( mid){
                            return ObjectId( mid);
                        });
                        outcomes.find( { _id : { $in : outcome_ids}}).toArray( function( e, outcome_list){
                            routine.outcome_list = outcome_list;
                            if( ndx === arr.length-1) resolve( routine_list);
                        });
                    });
                });
            } else {
                resolve( []);
            }
        });
    }).then( function( results){
        // TODO: bulk update on routines - hmmm, can we delete them?
        console.log( "completed routine list:", results);
        res.status(200).send( results);
    });
};

