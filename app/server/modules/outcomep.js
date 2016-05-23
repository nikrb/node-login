var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var outcomes;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("OutcomeP connected.");
    
    outcomes = db.collection( 'outcomes');
});

exports.findByMidList = function( outcome_mids){
    return new Promise( function( resolve, reject){
        var mids = outcome_mids.split(",");
        var midarr = mids.map( function( ele){
            return ObjectId( ele);
        });
        outcomes.find( { _id : { $in : midarr }}).toArray()
        .then( function( outcome_list){
            resolve( outcome_list);
        });
    });
};
