var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var shots;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Shot Connected.");
    
    shots = db.collection( 'shots');
});

exports.findAll = function( req, res){
    shots.find( {"owner":req.session.user._id}).
            toArray( function(err, items){
        if( err){
            console.log( "@Shot.findAll failed:", err);
            res.status(400).send( err);
        } else {
            console.log( "@Shot.findAll results:", items);
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    console.log( "Shots.saveAll owner:", user_id);
    var shot_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    // we only save new shots
    shots.insertMany( shot_list, [], function( err, objs){
        if( err){
            console.log( "@Shot.saveAll error:", err);
            res.status(400).send( err);
        } else {
            var results = objs.ops.map( function( obj){
                return { ios_id:obj.ios_id, _id:obj._id.toHexString()};
            });
            console.log( "@Shot.saveAll results:", results);
            res.send( results);
        }
    });
};
