var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var outcomes, practices;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log("PracticeP connected.");
    
    practices = db.collection( 'practices');
    outcomes = db.collection( 'outcomes');
});

exports.findPracticeByMidWithOutcomes = function( practice_mid){
    return new Promise( function( resolve, reject){
        practices.find( { _id : ObjectId( practice_mid)}).limit(1).next()
        .then( function( practice){
            var ids = practice.outcome_mids.split(",");
            var idarr = ids.map( function( ele){
                return ObjectId( ele);
            });
            outcomes.find( { _id : { $in : idarr }}).toArray()
            .then( function( outcome_list){
                practice.outcome_list = outcome_list;
                resolve( practice);
            });
        });
    });
};
