var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var log4js = require('log4js'); 
var logger = log4js.getLogger('shoot');
var drills;

var url = 'mongodb://localhost:27017/node-login';
MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    logger.info("Drill Connected.");
    
    drills = db.collection( 'drills');
});

exports.findAll = function( req, res){
    var drill_owners = ["system"];
    if( typeof req.session.user !== "undefined"){
        drill_owners.push( req.session.user._id);
    }
    drills.find( { owner : { $in : drill_owners}}).sort( { type : 1, phase : 1}).toArray( function(err, items){
        if( err){
            logger.error( "@drill.findAll failed:", err);
            res.status(400).send( [{ error:true, message:err}]);
        } else {
            logger.info( "@drill.findAll results:", items);
            res.send( items);
        }
    });
};

exports.create = function( req, res){
    drills.insertMany( req.body["drills"]).then( function( results){
        logger.trace( "create new drills:", results.ops);
        var drill_list = results.ops.map( function( obj){
            return { ios_id : obj.ios_id, mid : obj._id.toHexString()};
        });
        logger.info( "@drill.create restuls:", drill_list);
        res.send( drill_list);
    });
};
