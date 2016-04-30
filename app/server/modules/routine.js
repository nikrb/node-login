var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var routines;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Routine Connected.");
    
    routines = db.collection( 'routines');
});

exports.findAll = function( req, res){
    routines.find( { owner : req.session.user._id}).toArray( function( err, routine_list){
        if( err){
            console.log( "@Routine.findAll failed:", err);
            res.status(400).send( [{ error:true, message:err}]);
        } else {
            console.log( "@Routine.findAll results:", routine_list);
            res.status(200).send( routine_list);
        }
    });
};

exports.saveAll = function( req, res){
    // routines are mutabl
    var user_id = req.session.user._id;
    console.log( "@Routine.saveAll owner:", user_id);
    var routine_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    var promises = [];
    for( var i =0; i<routine_list.length; i++){
        var p = new Promise( function( resolve, reject){
            var routine = routine_list[i];
            console.log( "creating promise for routine:", routine);
            if( routine.mid.length){
                console.log( "replacing object with mid");
                routines.findOneAndReplace( { _id : ObjectId( routine.mid)},
                        routine, { projection: { ios_id:1, _id:1}, 
                                returnOriginal:false, 
                                upsert:true}, 
                    function( err, result){
                        console.log( "dealing with routine:", result.value);
                    if( err){
                        resolve( { error:true, message:err});
                    } else {
                        resolve( result.value);
                    }
                });
            } else {
                console.log( "inserting object without mid");
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
    }
	Promise.all( promises).then( function( results){
	    console.log( "@Routine.saveAll results:", results);
	    res.status(200).send( results);
	});

};
