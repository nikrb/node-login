var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var ObjectId = mongodb.ObjectID;
var assert = require('assert');
var log4js = require('log4js'); 
var logger = log4js.getLogger('shoot');
var shots;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    logger.info("Shot Connected.");
    
    shots = db.collection( 'shots');
});

exports.findAll = function( req, res){
    shots.find( {"owner":req.session.user._id}).
            toArray( function(err, items){
        if( err){
            logger.error( "@Shot.findAll failed:", err);
            res.status(400).send( err);
        } else {
            logger.info( "@Shot.findAll results:", items);
            res.send( items);
        }
    });
};

exports.saveAll = function( req, res){
    var user_id = req.session.user._id;
    logger.info( "@Shots.saveAll owner:", user_id);
    var shot_list = req.body.map( function( obj){
        obj.owner = user_id;
        return obj;
    });
    // we only save new shots
    shots.insertMany( shot_list, [], function( err, objs){
        if( err){
            logger.error( "@Shot.saveAll error:", err);
            res.status(400).send( err);
        } else {
            var results = objs.ops.map( function( obj){
                return { ios_id:obj.ios_id, _id:obj._id.toHexString()};
            });
            logger.info( "@Shot.saveAll results:", results);
            res.send( results);
        }
    });
};

exports.purge = function( shot_mid_list){
    var mids = shot_mid_list.map( function( ele){
        return ObjectId( ele);
    });
    shots.deleteMany( { _id : { $in : mids}}, {}, function( err, results){
        if( err){
            logger.error( "@shot.purge failed:", err);
        } else {
            logger.info( "@shot.purge count:", results.deletedCount);
        }
    });
};

