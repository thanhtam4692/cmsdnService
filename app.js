/**
 * Created by blues on 12/18/13.
 */
/**
 * Module dependencies.
 */


/***********************************************/

var express = require('express');
var app = express();
var http = require('http');
var path = require('path');
var gcm = require('node-gcm');

var request = require("request");
var util = require('util');
var cookie = require('cookie');
var fs = require('fs');
var jsdom = require('jsdom');
var jquery = fs.readFileSync("./public/javascripts/jquery-2.0.3.min.js", "utf-8");

var dburl = 'xitrum4692:xitrum@ds027419.mongolab.com:27419/cmsdn';
var collections = ['entries', 'noti'];
var db = require('mongojs').connect(dburl, collections);

var request = request.defaults({jar: true});

app.set('port', process.env.PORT || 8888);
app.set('views', path.join(__dirname, 'views'));
app.use(express.favicon());
app.use(express.logger('dev'));

//Parser
app.use(express.urlencoded());
app.use(express.json());
app.use(express.cookieParser());

app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

var user = {log: 'tamttse90036', pw: 'xitrum'};

// development only
if ('development' == app.get('env')) {
	app.use(express.errorHandler());
}

var head = {
	'x-frame-options': 'SAMEORIGIN',
	'content-type': 'text/html; charset=UTF-8',
	cookie: ''
};

var options = {
	host: 'http://cms-dn.fpt.edu.vn',
	path: '/news',
	method: 'GET',
	headers: '',
	'Accept': '/',
	'Connection': 'keep-alive'
};

var count = 1;

var pageData = null;

function download(page) {
	//console.log("page " + page);
	request.post('http://cms-dn.fpt.edu.vn/news/login.php', { form: { log: user.log, pwd: user.pw, 'wp-submit': 'Log In', 'rememberme': 'forever' } }, function (err, response, body) {
		//console.log("statusCode: " + util.inspect(,{ showHidden: true, depth: null }));
		request.get('http://cms-dn.fpt.edu.vn/news/?paged=' + page, function (err, response, body) {
			if (pageData != body) {
				getDetaiInterval();
				console.log("Get page 1, statusCode: " + util.inspect(response.statusCode, { showHidden: true, depth: null }));
				if (!err && response.statusCode == 200 && body.length != 0) {
					jsdom.env({
						html: body.toString(),
						src: [jquery],
						done: function (errors, window) {
							var $ = window.$;
							$('.post').each(function () {
								var entry = {
									title: $(this).find(".entry-title a").text(),
									link: $(this).find(".entry-title a").attr('href'),
									date: $(this).find(".entry-date").attr('datetime'),
									author: $(this).find(".by-author .author a").text(),
									summary: $(this).find(".entry-summary p").text(),
									content: ''
								};
								db.entries.save(entry, function (err, saved) {
									if (!err && saved != null) {
										console.log(saved.link + " added");
									}
								});
							});
						}
					});
				}
				pageData = body;
			}
		});
	});
}

var countDetailDown = 1;

function getDetail(skip) {
	//console.log("statusCode: " + util.inspect(,{ showHidden: true, depth: null }));
	db.entries.find({content: ''}).skip(skip, function (err, entries) {
		countDetailDown = entries.length;
		if (!err && entries.length != 0) {
			var entry = entries[0];
			request.post('http://cms-dn.fpt.edu.vn/news/login.php', { form: { log: user.log, pwd: user.pw, 'wp-submit': 'Log In', 'rememberme': 'forever' } }, function (err, response, body) {
				request.get(entry.link, function (err, response, body) {
					//console.log(entry.link + " " + response.statusCode);
					if (response.statusCode == '200') {
						jsdom.env({
							html: body.toString(),
							src: [jquery],
							done: function (errors, window) {
								var $ = window.$;
								if (entry.content = $('.entry-content').html()) {
									db.entries.update(
										{'date': entry.date},
										entry,
										{ upsert: true },
										function(){
											sendNoti('CMS-DN ' + entry.title);
											console.log(entry.link + " detai added");
										}
									);
								}
							}
						});
					}
				});
			});
		}
	});
}

function getDetaiInterval() {
	countDetailDown = 1;
	var inte = setInterval(function () {
		getDetail(0);
		console.log("Interval "+ countDetailDown);
		if(countDetailDown == 0){
			clearInterval(inte);
		}
	}, 4000);
}

/**
 * Getting from cms-dn
 */
//var skip = 0;
//db.entries.count(function(err, result){
//	var inte = setInterval(function () {
//		getDetail(skip);
//		skip++;
//		console.log("Skipping: " + skip);
//		if ((skip - 2) == result) {
//			clearInterval(inte);
//		}
//	}, 10000);
//});
//
//download(count);
//count++;
//
//setInterval(function(){
//	download(count);
//	count++;
//}, 180000);

setInterval(function () {
	download(1);
}, 10000);



var server = http.createServer(app).listen(app.get('port'), function () {
	console.log('Express server listening on port ' + app.get('port'));
});


app.get('/cmsnews', function (req, res) {
	var news = null;
	db.entries.find({}).limit(50).sort({date: -1}, function (err, result) {
		if (!err && result.length != 0) {
			news = result;
			res.header("Cache-Control", "no-cache, no-store, must-revalidate");
			res.header("Pragma", "no-cache");
			res.header("Expires", 0);
			res.send({newses: news});
		} else {
			res.header("Cache-Control", "no-cache, no-store, must-revalidate");
			res.header("Pragma", "no-cache");
			res.header("Expires", 0);
			res.send({newses: news});
		}
	});

});

app.get('/cmsreset', function (req, res) {
	pageData = null;
	res.send('Page 1 will be re-download');
});

app.get('/download', function (req, res){
	fs.readFile('./public/FPTGroup1RssReader.apk', function(err,data){
		res.send(data);
	});
});

app.post('/cmsnews', function (req, res) {
	var news = null;
	db.entries.find({}).limit(50).sort({date: -1}, function (err, result) {
		if (!err && result.length != 0) {
			news = result;
			res.header("Cache-Control", "no-cache, no-store, must-revalidate");
			res.header("Pragma", "no-cache");
			res.header("Expires", 0);
			res.send({newses: news});
		} else {
			res.header("Cache-Control", "no-cache, no-store, must-revalidate");
			res.header("Pragma", "no-cache");
			res.header("Expires", 0);
			res.send({newses: news});
		}
	});

});

app.post('/register', function (req, res) {
	var name = 'user';
	var email = 'email';
	var regId = req.body.regId;
	db.noti.update(
		{ "regId": regId },
		{ "name": name, "email": email, "regId": regId },
		{ upsert: true },
		function () {
			console.log("Updated: " + regId);
		});

	res.send("DM Tuan DM")
});

function sendNoti(content){

    // with object values
	var message = new gcm.Message({
		//collapseKey: 'cms',
		//delayWhileIdle: true,
		//timeToLive: 10,
		data: {
			news: content
		}
	});
	var sender = new gcm.Sender('AIzaSyAMfzLbZHf5-CDVAnxFmuP6clCaFsDJNi8');
	var registrationIds = [];
	db.noti.find({}, function (err, getted) {
		getted.forEach(function (each) {
			registrationIds.push(each.regId);
		});

		/**
		 * Params: message-literal, registrationIds-array, No. of retries, callback-function
		 **/
		sender.send(message, registrationIds, 10, function (err, result) {
			console.log(result);
		});
	})
}





