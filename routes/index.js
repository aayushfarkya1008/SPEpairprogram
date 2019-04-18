var express = require('express');
const rp = require('request-promise');
const $ = require('cheerio');
const axios = require('axios');
var questionsSchema = require('../models/questions');
var mongooseQuestions = require('mongoose');

mongooseQuestions.connect('mongodb://localhost/questions',{useNewUrlParser: true});


var question = mongooseQuestions.model('questions', questionsSchema);

var router = express.Router();
var onlineUser= new Map();
var usersInMatch = new Map();
var sockets = new Map();
var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next();  
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/');
}

module.exports = function(passport, io){

	/* GET login page. */
	router.get('/', function(req, res) {
    	// Display the Login page with any flash message, if any
		res.render('index', { message: req.flash('message') });
	});

	/* Handle Login POST */
	router.post('/login', passport.authenticate('login', {
		successRedirect: '/home',
		failureRedirect: '/',
		failureFlash : true  
	}));

	/* GET Registration Page */
	router.get('/signup', function(req, res){
		res.render('register',{message: req.flash('message')});
	});

	/* Handle Registration POST */	
	router.post('/signup', passport.authenticate('signup', {
		successRedirect: '/home',
		failureRedirect: '/signup',
		failureFlash : true  
	}));

	/* GET Home Page */
	router.get('/home', isAuthenticated, function(req, res){
		res.render('home', { user: req.user });
	});

	/* Handle Logout */
	router.get('/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});

	/* Handle Registration POST */	
	router.post('/connectToUser', (req, res)=>{
		console.log('Inside connectToUser '+req.body);
		var challengerName = req.body.name;
		var challenger = req.body.challengerSocketID;
		var opponent = req.body.opponentSocketID;
		if(usersInMatch.has(opponent)){
	
		}else{
			usersInMatch.set(opponent, {challengerSocketID:challenger,
                						opponentSocketID:opponent});
		}
		io.to(opponent).emit('challengeReceived',{name:challengerName})
	});

	router.post('/problem',(req,res)=>{
		let url = req.body.url;
		//console.log('url is'+url);
		rp(url)
		.then(function (html) {
				
			 var statement = $('.problem-description', html).html();
			 var sampleInput = $('.input-output-container .input-output .dark', html).eq(0).text();
			 var sampleOutput = $('.input-output-container .input-output .dark', html).eq(1).text();
			console.log(sampleInput);
			console.log(sampleOutput);
			problemData = {statement: statement,
										 sampleInput: sampleInput,
										 sampleOutput: sampleOutput
										}
			res.json(problemData);
		})
		.catch(function (err) {
			// Crawling failed or Cheerio choked...
		});
	  //app.use
	  })
	  
	  router.post('/', function(req, res) {
		//console.log(req.body.code);
		var source = req.body.code;
		var type = req.body.type;
		var testCase;
		var testCaseResult;
		var mySocketID = req.body.socketid;
		var langid=req.body.langid;
		
		if(type == 'compile'){
			testCase = req.body.sampleInput;
			testCaseResult = req.body.sampleOutput.trim();
			makeRequest(res, source, testCase, testCaseResult, mySocketID,langid)
		}else if(type == 'submit'){
			let url = req.body.url;
			console.log(url);
			/*question.find(function (err,  docs) {
				if (err) return console.error(err);
				console.log(docs);
			  })*/
			  question.findOne({ 'url': url }, 'finalTestCase finalSolution', function (err, questiongot) {
				if (err) console.log(err);
				console.log(questiongot);
				testCase = questiongot.finalTestCase;
				//testCase = '10\n570 751 980 995 529 940 212 848 718 515'
				testCaseResult = questiongot.finalSolution.trim();
				makeRequest(res, source, testCase, testCaseResult, mySocketID,langid);
			  });
			//testCase = req.body.sampleInput;
			//testCaseResult = req.body.sampleOutput.trim();
		}
		//testCase = '10\n570 751 980 995 529 940 212 848 718 515';
		//console.log('testcase is'+ testCase);
		
	  })
	  
	
	io.on('connection', function(socket){
		if(sockets.has(socket.id)){
	
		}else{
			sockets.set(socket.id, socket);
		}
		response={}
		console.log('socket id is '+socket.id);
		socket.on('codeInEditor', function(msg){
		  console.log(msg);
		  response.text = msg.text;
		  response.name = msg.name;
			//io.sockets.emit('codeInOpponentsEditor', response);
			socket.to(msg.socketid).emit('codeInOpponentsEditor', response);
		});
	
		socket.on('userConnected', function(msg){
			if(onlineUser.has(msg.userName)){
	
			}else{
				onlineUser.set(msg.socketid, msg);
			}
			if(onlineUser.size != 0){
				let userArray = []
				onlineUser.forEach( user=>{userArray.push(user)});
				io.sockets.emit('newUserConnected', {userArray});
			}
		});
		socket.on('disconnect', function(){
			console.log('socket disconnected'+socket.id);
			onlineUser.delete(socket.id);
			sockets.delete(socket.id);
			let userArray = []
			onlineUser.forEach( user=>{userArray.push(user)});
			io.sockets.emit('newUserConnected', {userArray});
		});
	
		socket.on('challengeAccepted', function(msg){
			var opponentSocketID = msg.opponentSocketID;
			if(usersInMatch.has(opponentSocketID)){
				challengerSocketID = usersInMatch.get(opponentSocketID).challengerSocketID;
				//io.to(challengerSocketID).emit('joinroom',{roomId:opponent})
				//console.log(sockets[challengerSocketID]);
				sockets.get(challengerSocketID).join(opponentSocketID);// Included first
				sockets.get(opponentSocketID).join(challengerSocketID);// Included next day
				io.in(opponentSocketID).emit('loadChallenge', {questionUrl:"https://www.hackerearth.com/practice/algorithms/sorting/insertion-sort/practice-problems/algorithm/the-rise-of-the-weird-things-1/"});
				var starttime = new Date();
				endtime = addMinutes(starttime, 1);
				
				var timeinterval = setInterval(function(){
					var time = getTimeRemaining(endtime);
					io.in(opponentSocketID).emit('timer',{time:time});
					if(time.total<=0){
						io.in(opponentSocketID).emit('timesUp','timer has expired');
						clearInterval(timeinterval);
					}
				},1000);
				/*const timeoutObj = setTimeout(() => {
					io.in(opponentSocketID).emit('timesUp','timer has expired');
				}, 1500);*/
				
			}
			console.log(msg);
		});
		socket.on('challengeRejected', function(msg){
			var opponent = msg.opponentSocketID;
			if(usersInMatch.has(opponent)){
				challengerSocketID = usersInMatch.get(opponent).challengerSocketID;
				io.to(challengerSocketID).emit('hideSpinner',{message:"Invitation Declined"});
				usersInMatch.delete(opponent);
			}
			console.log(msg);
		});
		});
		
		function addMinutes(date, minutes) {
			return new Date(date.getTime() + minutes*60000);
		}

		function getTimeRemaining(endtime){
			var t = Date.parse(endtime) - Date.parse(new Date());
			var seconds = Math.floor( (t/1000) % 60 );
			var minutes = Math.floor( (t/1000/60) % 60 );
			var hours = Math.floor( (t/(1000*60*60)) % 24 );
			var days = Math.floor( t/(1000*60*60*24) );
			return {
				'total': t,
				'days': days,
				'hours': hours,
				'minutes': minutes,
				'seconds': seconds
			};
		}

		function makeRequest(res, source, testCase, testCaseResult, mySocketID,langid){
			axios.post('https://api.judge0.com/submissions/', {
			source_code: source,
			language_id: langid,
			stdin: testCase
			
			})
			.then(function (response) {
			let token = response.data.token;
			axios.get('https://api.judge0.com/submissions/'+token)
			.then(function(response){
				//console.log(response);
				//console.log(response.data.status);
				if(response.data.status.id == 1){
				setTimeout(function() {
					axios.get('https://api.judge0.com/submissions/'+token)
					.then(function(response){
						console.log("Response from judnge 0");
						console.log(response)
						compileData = {}
						compileData.result = response.data.stdout.trim();
						//console.log('Result =='+compileData.result.localeCompare(testCaseResult));
						console.log(typeof(compileData.result));
						console.log(typeof(testCaseResult));
						console.log(compileData.result === testCaseResult);
						if(compileData.result === testCaseResult){
							compileData.status = "Accepted"
							io.in(mySocketID).emit('opponentsResult', 'Accepted');

						}else{
							compileData.status = "Failed"
							io.in(mySocketID).emit('opponentsResult', 'Failed');

						}
						res.json({
						compileData: compileData
						});
				})
				}, 5000);
				}
			})
			})
			.catch(function (error) {
			console.log(error);
			});
		}
	return router;
}

