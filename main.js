const Q = require('q');
const gather = require('./gather');
const download = require('./download');

//var promice = gather.fromBookmarks("bookmarks_30_08_2016.html", "/../data/");
var promice = gather.fromTags("eu03", "/../data/");

var limit = 16;
var running = 0;
function throlledDownload(resultArray) {
	while(running < limit && 0 < resultArray.length) {
		running++;
		var data = resultArray.shift();
		var name = data["name"];
		var uri = data["uri"];
		var filePath = data["filePath"];

		download(uri, filePath, function()
		{
			console.log("downloaded:" + filePath);
			running--;
			if(0 < resultArray.length)
			{
				throlledDownload(resultArray);
			}
		});
	}
}

Q(promice)
.then(function(resultArray){
	console.log("result:" + resultArray.length);

	throlledDownload(resultArray);
})
.catch(function(error){
	console.log("catch:" + error);
});

