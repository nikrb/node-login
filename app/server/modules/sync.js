var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var routines, workouts, drills, accounts;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Connected.");
    
    routines = db.collection( 'routines');
    workouts = db.collection( 'workouts');
    drills = db.collection( 'drills');
    accounts = db.collection('accounts');
    // db.close();
});

exports.retrieveRoutinesForTarget = function( req, res){
    console.log( "@retrieveRoutinesForTarget");
    // FIXME: for browser testing
    var user_id = ( typeof req.session.user === "undefined")? "56e79125168800421b87e5d7" : req.session.user._id;

    var rp = new Promise( function( resolve, reject){
        routines.find( {owner : user_id}).toArray()
        .then( function( results){
            results.forEach( function( obj, ndx, arr){
                accounts.find( {email:obj.creator}).next( function( e, acc){
                    // obj.creator_account = acc;
                    obj.creator_id = acc._id.toHexString();
                    workouts.find( { owner : obj.creator_id, name : obj.ofWorkout}).next( function( e, workout){
                        console.log( "got workout:", workout);
                        obj.workout = workout;
                        drills.find( { owner : { $ne : "system"}}).toArray( function( e, drill_list){
                            if( drill_list.length > 0){
                                obj.drills = drill_list;
                            }
                            if( ndx === arr.length-1) resolve( results);
                        });
                    });
                });
            });
        });
    }).then( function( results){
        console.log( "results:", results);
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
                            var newrou = { ios_id : obj.ios_id, mid : obj._id};
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

