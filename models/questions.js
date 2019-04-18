var mongoose = require('mongoose');
module.exports =new mongoose.Schema({
    url : String,
    finalTestCase: String,
    finalSolution : String
});
