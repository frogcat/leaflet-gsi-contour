(function() {

	var DEM = function(x, y, z, f, fn) {
		this.x = x;
		this.y = y;
		this.z = z;
		this.f = f;
		this.fn = fn;
		this.contour = [];
	};

	DEM.prototype = {
		getURL : function() {
			var url = "http://cyberjapandata.gsi.go.jp/xyz/dem/{z}/{x}/{y}.txt";
			url = url.replace("{z}", this.z - this.f);
			url = url.replace("{x}", Math.floor(this.x / Math.pow(2, this.f)));
			url = url.replace("{y}", Math.floor(this.y / Math.pow(2, this.f)));
			return url;
		},
		setup : function(txt) {
			var g = Math.pow(2, this.f);
			var len = 256 / g;
			var ox = (this.x % g) * len;
			var oy = (this.y % g) * len;
			var data = [];
			txt.replace(/\n+$/, "").split("\n").forEach(function(row, y) {
				if (y < oy || oy + len <= y)
					return;
				row.split(",").forEach(function(z, x) {
					if (x < ox || ox + len <= x)
						return;
					if (!data[x - ox])
						data[x - ox] = [];
					data[x - ox][y - oy] = Math.round(z == 'e' ? 0 : parseFloat(z)) + 0.001;
				});
			});

			var zt = [];
			for (var i = 0; i < 4000; i += 10) {
				if (this.fn(this.z, i) != null)
					zt.push(i);
			}

			var tick = [];
			for (var i = 0; i < len; i++)
				tick.push(256 * i / (len - 1));

			var con = new Conrec();
			con.contour(data, 0, tick.length - 1, 0, tick.length - 1, tick, tick, zt.length, zt);
			this.contour = con.contourList();

		},
		draw : function(canvas) {
			var context = canvas.getContext('2d');
			var z = this.z;
			var fn = this.fn;
			this.contour.forEach(function(points) {
				var s = fn(z, points.level);
				for ( var a in s)
					context[a] = s[a];
				context.beginPath();
				points.forEach(function(p, i) {
					if (i == 0)
						context.moveTo(p.x, p.y);
					else
						context.lineTo(p.x, p.y);
				});
				context.stroke();
			});
		}
	};

	L.TileLayer.GSIContour = L.TileLayer.Canvas.extend({
		options : {
			attribution : "<a href='http://maps.gsi.go.jp/development/'>10mメッシュ標高データ (国土地理院)</a>",
			async : true
		},
		drawTile : function(canvas, p, z) {
			var f = (z > 14 ? z - 14 : 1);
			var dem = new DEM(p.x, p.y, z, f, this.getStyle);
			var xhr = new XMLHttpRequest();
			var that = this;
			xhr.onload = function() {
				dem.setup(this.responseText);
				dem.draw(canvas);
				that.tileDrawn(canvas);
			};
			xhr.open("get", dem.getURL(), true);
			xhr.send();
			return this;
		},
		getStyle : function(zoom, level) {
			switch (zoom) {
			case 15:
				if (level % 50 == 0)
					return style.bold;
				else if (level % 10 == 0)
					return style.thin;
				break;
			case 14:
			case 13:
				if (level % 100 == 0)
					return style.bold;
				else if (level % 20 == 0)
					return style.thin;
				break;
			case 12:
			case 11:
				if (level % 500 == 0)
					return style.bold;
				else if (level % 100 == 0)
					return style.thin;
				break;
			case 10:
			case 9:
				if (level % 1000 == 0)
					return style.bold;
				else if (level % 200 == 0)
					return style.thin;
				break;
			default:
				if (level % 5000 == 0)
					return style.bold;
				else if (level % 1000 == 0)
					return style.thin;
				break;
			}
			return null;
		}
	});

	var style = {
		"bold" : {
			strokeStyle : "#fff",
			lineWidth : 1.6
		},
		"thin" : {
			strokeStyle : "#fff",
			lineWidth : 1.0
		}
	};

	L.tileLayer.GSIContour = function(opt) {
		return new L.TileLayer.GSIContour(opt);
	};
})();
