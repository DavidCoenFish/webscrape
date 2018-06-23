const Q = require('q');
var request = require('request');
var cheerio = require('cheerio');
var mkdirp = require('mkdirp');
const url = require('url');
const path = require("path");
var fs = require('fs');

/*
fullUrl:
http://gelbooru.com/index.php?page=dapi&s=post&q=index&tags=breasts%2Bcleavage%2Bwide_hips&pid=0
*/

//return promice giving [{"name":"", "uri":"", "filePath":"dest_path_to_save"}]
module.exports.fromBookmarks = function(filePath, destFileRoot)
{
	var file = fs.readFileSync(filePath);
	const dom = cheerio.load(file);

	var tagArray = [];

	dom("A").filter(function(){
		return -1 !== dom(this).attr("href").indexOf("http://gelbooru.com/index.php?page=post&s=list&tags=");
	}).each(function(i, elem) {
		var urlObject = url.parse(dom(this).attr("href"));
		var queryArray = urlObject.query.split("&");
		queryArray.forEach(function(element){
			if (-1 === element.indexOf("tags="))
			{
				return;
			}
			var name = decodeURIComponent(element.substring(5));
			tagArray.push(name);
		});
	});

	var promiceArray = [];
	tagArray.forEach(function(tags){
		promiceArray.push(module.exports.fromTags(tags, destFileRoot));
	});

	return Q.all(promiceArray)
	.then(function(arrayResult){
		var flatArray = [];
		arrayResult.forEach(function(itemArray){
			itemArray.forEach(function(item){
				flatArray.push(item);
			});
		});
		return flatArray;
	});
}

//return promice giving [{"name":"", "uri":"", "filePath":"dest_path_to_save"}]
module.exports.fromTags = function(tags, destFileRoot)
{
	const destPath = path.join(__dirname, destFileRoot + tags.replace(/[^a-z0-9]/gi, '_').toLowerCase());	

	mkdirp.sync(destPath);

	const splitTags = tags.split("+");
	splitTags.forEach(function(part, index, theArray) {
	  theArray[index] = encodeURIComponent(part);
	});

	const encodedTags = splitTags.join("+");
	const urlApi = "http://gelbooru.com/index.php?page=dapi&s=post&q=index&tags=" + encodedTags;

	var promice = downloadIndex(urlApi, 0, destPath);

	return promice;
}

const downloadIndex = function(urlApi, index, destPath)
{
	const fullUrl = urlApi + "&pid=" + index;
	var defer = Q.defer();

	console.log(fullUrl);

	request(fullUrl, function(error, response, html)
	{
		if(error)
		{
			console.log("error:" + error);
			defer.reject(error);
			return;
		}

		var arrayResult = [];
		const dom = cheerio.load(html);
		const count = dom('posts').attr("count");
		dom('post', 'posts').each(function(i, elem) {
			var href = dom(this).attr('file_url');

			var localUrl = url.parse(href);
			var bits = localUrl.pathname.split("/");
			if (bits.length <= 0)
			{
				console.log("failed to parse name:" + name);
				return;
			}
			var fileName = bits[bits.length - 1];
			const filePath = path.join(destPath, fileName);

			var result = {"name": fileName, "uri":href, "filePath":filePath};

			arrayResult.push(result);
		});

		if (((index + 1) * 100 < count) &&
			(index < 100))
		{
			var promice = downloadIndex(urlApi, index + 1, destPath);
			promice.then(function(result){
				arrayResult = arrayResult.concat(result);
				defer.resolve(arrayResult);
			});
		}
		else
		{
			if (0 == index)
			{
				console.log("resolve[" + arrayResult.length + "]:" + urlApi);
			}
			defer.resolve(arrayResult);
		}
	});

	return defer.promise;
}
