var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var log4js = require('log4js'); 
var logger = log4js.getLogger('shoot');
var outcomes;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    logger.info("Outcome connected.");
    
    outcomes = db.collection( 'outcomes');
});

exports.findAll = function( req, res){
    var user_id = req.session.user._id;
    logger.info( "@outcome.findAll user:", user_id);
    outcomes.find( {"owner": user_id}).toArray( function(err, items){
        if( err){
            logger.error( "@Outcome.findAll failed:", err);
            res.status(400).send( err);
        } else {
            logger.info( "@Outcome.findAll results", items);
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    logger.info( "@Outcome.saveAll owner:", user_id);
    var outcome_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    // we only save new outcomes
    outcomes.insertMany( outcome_list, [], function( err, objs){
        if( err){
            logger.error( "@Outcome.saveAll error:", err);
            res.status(400).send( err);
        } else {
            var results = objs.ops.map( function( obj){
                return { ios_id:obj.ios_id, _id:obj._id.toHexString()};
            });
            logger.info( "@Outcome.saveAll results:", results);
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
            logger.error( "@outcome.purge failed:", err);
        } else {
            logger.info( "@outcome.purge count:", results.deletedCount);
        }
    });
};

