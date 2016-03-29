var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var routines, workouts, drills, accounts, practices, outcomes;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Connected.");
    
    accounts = db.collection('accounts');
    routines = db.collection( 'routines');
    workouts = db.collection( 'workouts');
    drills = db.collection( 'drills');
    practices = db.collection( "practices");
    outcomes = db.collection( "outcomes");
    // db.close();
});

exports.sendCompletedRoutines = function( req, res){
    // FIXME: for browser testing
    var user_id = ( typeof req.session.user === "undefined")? "56e79125168800421b87e5d7" : req.session.user._id;

    var routine_list = req.body["routines"];
    var practice_list = req.body["practices"];
    var outcome_list = req.body["outcomes"].map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    
    function getOutcomeMidList( ios_id_list){
        var ret = [];
        for( var i =0; i<outcome_list.length; i++){
            var outcome = outcome_list[i];
            if( ios_id_list.indexOf( outcome.ios_id) !== -1){
                ret.push( outcome._id.toHexString());
            }
        }
        return ret;
    }
    function getRoutinePracticeMid( practice_ios_id, inserted_practices ){
        for( var i =0; i<inserted_practices.length; i++){
            var practice = inserted_practices[i];
            if( practice.ios_id === practice_ios_id) return practice._id.toHexString();
        }
        return null;
    }
    
    var p = new Promise( function( resolve, reject){
        outcomes.insertMany( outcome_list).then( function( new_outcomes){
            var inserted_outcomes = new_outcomes.ops;
            inserted_outcomes.forEach( function( obj){
                obj.mid = obj._id.toHexString();
            });
            
            practice_list.forEach( function( practice){
                practice.owner = user_id;
                practice.outcomes_mids = getOutcomeMidList( practice.outcome_ids);
            });
            practices.insertMany( practice_list).then( function( new_practices){
                var inserted_practices = new_practices.ops;
                routine_list.forEach( function( routine, ndx, arr){
                    routine.practice_mid = getRoutinePracticeMid( routine.practice_ios_id, inserted_practices);
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
            });
        });
    }).then( function( results){
        console.log( "routines:", routine_list);
        console.log( "practices:", practice_list);
        console.log( "outcomes:", outcome_list);
        var data = routine_list.map( function( obj){
            return { ios_id : obj.ios_id };
        });
        res.status(200).send( data);
    });
}

exports.retrieveRoutinesForTarget = function( req, res){
    console.log( "@retrieveRoutinesForTarget");
    // FIXME: for browser testing
    var user_id = ( typeof req.session.user === "undefined")? "56e79125168800421b87e5d7" : req.session.user._id;
    
    var rp = new Promise( function( resolve, reject){
        routines.find( {owner : ObjectId( user_id)}).toArray()
        .then( function( results){
            results.forEach( function( obj, ndx, arr){
                workouts.find( { owner : obj.creator_mid, name : obj.workout_name}).next( function( e, workout){
                    obj.workout = workout;
                    if( workout.hasDrills.length > 0){
                        var drill_ids = workout.hasDrills.split( ",");
                        drills.find( { owner : { $ne : "system"},
                                        _id : {$in : drill_ids}
                                    }).toArray( function( e, drill_list){
                            if( drill_list.length > 0){
                                obj.drills = drill_list;
                            }
                            if( ndx === arr.length-1) resolve( results);
                        });
                    } else {
                        if( ndx === arr.length-1) resolve( results);
                    }
                });
            });
        });
    }).then( function( results){
        console.log( "retrieveRoutinesForTarget [%s] results:", req.session.user.email, results);
        res.status(200).send( results);
    });
};

exports.createRoutinesForTargets = function( req, res){
    var user_id = req.session.user._id;
    var data = {};
    var body = req.body[0];
    function setObjMids( objs){
        var ret = objs.map( function( obj){
            var o = {};
            o.ios_id = obj.ios_id;
            o.mid = obj._id;
            return o;
        });
        return ret;
    }
    var promises = [];
    for( var i=0; i<body["routines"].length; i++){
        var routine = body["routines"][i];
        routine.state = "requested";
        // this is a compound promise so wrap in a bespoke promise to get it working
        var acc = new Promise( function( resolve, reject){
            accounts.find( {email:routine.target} ).toArray().then( function(results){
                if( results.length == 0){
                    resolve( { ios_id : routine.ios_id, 
                                                target : routine.target,
                                                error : "target player not registered"});
                } else {
                    var target_user = results[0];
                    routine.owner = target_user._id;
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

    if( body.hasOwnProperty( "workouts")){
        var workout_list = body["workouts"].map( function( obj){
            obj.owner = user_id;
            return obj;
        });
        // it seems these simple promises work ok
        var p = workouts.insertMany( workout_list).then( function( results){
            var ret_workouts = setObjMids( results.ops);
            data["workouts"] = ret_workouts;
        });
        promises.push( p);
        
        if( body.hasOwnProperty( "drills")) {
            var drill_list = body["drills"].map( function( obj){
                obj.owner = user_id;
                return obj;
            });
            var dp = drills.insertMany( drill_list).then( function( results){
                    var ret_drills = setObjMids( results.ops);
                    data["drills"] = ret_drills;
            });
            promises.push( dp);
        }
    }
    Promise.all( promises).then( function( results){
        data["routines"] = [];
        for( var i=0; i< results.length; i++){
            if( typeof results[i] !== "undefined"){
                data["routines"].push( results[i]);
            }
        }
        console.log( "promises complete, return data:", data);
        res.status(200).send( [data]);
    });
};


