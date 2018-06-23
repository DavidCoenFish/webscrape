var request = require('request');
var fs = require('fs');

module.exports = function(uri, filename, callback)
{
	try{
		//test if files exists
		try{
			var stats = fs.lstatSync(filename);
			if (stats.isDirectory()){
				callback();
				return;
			}
			if (stats.isFile()){
				var fileSizeInBytes = stats["size"];
				if (206 < fileSizeInBytes){
					callback();
					return;
				}
			}
		}
		catch(err)
		{
			//console.log(err);
		}

		request.head(uri, function(err, res, body)
		{
			if (err)
			{
				callback(err);
				return;
			}
			//console.log('content-type:', res.headers['content-type']);
			//console.log('content-length:', res.headers['content-length']);
			request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
		});
	}
	catch(err)
	{
		callback(err);
		return;
	}
};


