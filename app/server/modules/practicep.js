var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var log4js = require('log4js'); 
var logger = log4js.getLogger('shoot');
var outcomes, practices;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    logger.info("PracticeP connected.");
    
    practices = db.collection( 'practices');
    outcomes = db.collection( 'outcomes');
});

exports.findPracticeByMidWithOutcomes = function( practice_mid){
    logger.trace( "finding practice with mid:", practice_mid);
    return new Promise( function( resolve, reject){
        practices.find( { _id : ObjectId( practice_mid)}).toArray()
        .then( function( practices){
            if( practices.length > 0){
                var practice = practices[0];
                var ids = practice.outcome_mids.split(",");
                var idarr = ids.map( function( ele){
                    return ObjectId( ele);
                });
                logger.trace( "found practice, getting outcome mids:", practice.outcome_mids);
                outcomes.find( { _id : { $in : idarr }}).toArray()
                .then( function( outcome_list){
                    practice.outcome_list = outcome_list;
                    resolve( practice);
                });
            } else {
                logger.warn( "@practice.findPracticeByMidWithOutcomes not found for practice mid:", practice_mid);
                resolve( []);
            }
        });
    });
};
