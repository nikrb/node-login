var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var drills;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("Connected.");
    
    drills = db.collection( 'drills');
    // db.close();
});

exports.findAll = function( req, res){
    drills.find().sort( { type : 1, phase : 1}).toArray( function(err, items){
        if( err){
            console.log( "fetch drills failed");
        } else {
            res.send( items);
        }
    });
};