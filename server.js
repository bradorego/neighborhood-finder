const express = require('express');
const app = express();
const compression = require('compression');
const craigslist = require('node-craigslist');

let cl_client = new craigslist.Client({
  city : 'nyc',
  category: 'aap'
});

app.use(compression());
app.use(express.static('static'));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/craigslist', (req, res) => {
  cl_client.search({
    postal: req.query.zip,
    searchDistance: 0.25,
    bundleDuplicates: true,
    minAsk: 500,
    category: 'aap'
  }).then((data) => {
    let max = 0;
    let min = Number.MAX_SAFE_INTEGER;
    let mean = 0;
    let ignored = 0;
    data.forEach((entry) => {
      if (entry.price[0] === "$") {
        let price = parseInt(entry.price.substr(1), 10);
        if (price !== NaN) {
          max = Math.max(max, price);
          min = Math.min(min, price);
          mean += price;
        } else {
          ignored++;
          console.log(entry.price);
        }
      } else {
        ignored++;
        console.log(entry.price);
      }
    });
    mean = Math.round(mean / (data.length - ignored));
    res.json({
      min: min,
      max: max,
      mean: mean
    });
  }).catch((err) => {
    console.error(err);
    res.status(500);
    res.send(err);
  });
});

app.set('port', process.env.PORT || 3000);
app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
