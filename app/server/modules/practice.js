var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var practices;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Practice onnected.");
    
    practices = db.collection( 'practices');
});

exports.findAll = function( req, res){
    practices.find( {"owner": req.session.user._id}).toArray( function(err, items){
        if( err){
            console.log( "@Practice.findAll failed:", err);
            res.status(400).send( err);
        } else {
            console.log( "@Practice.findAll results", items);
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    console.log( "@Practice.saveAll owner:", user_id);
    var practice_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    // we only save new practices
    practices.insertMany( practice_list, [], function( err, objs){
        if( err){
            console.log( "@Practice.saveAll error:", err);
            res.status(400).send( err);
        } else {
            var results = objs.ops.map( function( obj){
                return { ios_id:obj.ios_id, _id:obj._id.toHexString()};
            });
            console.log( "@Practice.saveAll results:", results);
            res.status(200).send( results);
        }
    });
};
