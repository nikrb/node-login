var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var outcomes;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Outcome connected.");
    
    outcomes = db.collection( 'outcomes');
});

exports.findByPracticeMid = function( outcome_mids){
    return new Promise( function( resolve, reject){
        var mids = outcome_mids.split(",");
        var midarr = mids.map( function( ele){
            return ObjectId( ele);
        });
        console.log( "getting outcome mids:", mids);
        outcomes.find( { _id : { $in : midarr }}).toArray()
        .then( function( outcome_list){
            resolve( outcome_list);
        });
    });
};

exports.findAll = function( req, res){
    var user_id = req.session.user._id;
    console.log( "@outcome.findAll user:", user_id);
    outcomes.find( {"owner": user_id}).toArray( function(err, items){
        if( err){
            console.log( "@Outcome.findAll failed:", err);
            res.status(400).send( err);
        } else {
            console.log( "@Outcome.findAll results", items);
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    console.log( "@Outcome.saveAll owner:", user_id);
    var outcome_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    // we only save new outcomes
    outcomes.insertMany( outcome_list, [], function( err, objs){
        if( err){
            console.log( "@Outcome.saveAll error:", err);
            res.status(400).send( err);
        } else {
            var results = objs.ops.map( function( obj){
                return { ios_id:obj.ios_id, _id:obj._id.toHexString()};
            });
            console.log( "@Outcome.saveAll results:", results);
            res.status(200).send( results);
        }
    });
};

exports.purge = function( outcome_mid_list){
    var mids = outcome_mid_list.map( function( ele){
        return ObjectId( ele);
    });
    outcomes.deleteMany( { _id : { $in : mids}}, {}, function( err, results){
        if( err){
            console.log( "@outcome.purge failed:", err);
        } else {
            console.log( "@outcome.purge count:", results.deletedCount);
        }
    });
};

