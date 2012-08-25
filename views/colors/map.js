function (doc) {
	var toks = doc._id.split('-');
	var year = toks[0].substr(0, 4);
	var month = toks[0].substr(4,6);
	var num = toks[1];
	var stops = [];
	var offset = 0;

	for (var i = 0; i < doc.colors.length; i++) {
		if (Math.floor(doc.colors[i].frequency * 100) > 0) {
			stops.push({
				'stop-color': doc.colors[i].color,
				'offset': offset,
			});

			offset += doc.colors[i].frequency;

			if ((i + 1) < doc.colors.length) {
				stops.push({
					'stop-color': doc.colors[i].color,
					'offset': offset
				});
			}
		}
	}

	emit([year, month, num], stops);
}