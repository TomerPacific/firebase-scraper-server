var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
const rp = require('request-promise');
const cheerio = require('cheerio');


const daysPassedToScrapeAgain = 1;
var port = process.env.PORT || 3000;
var app = express();
var lastDateScraped;

const url = "https://status.firebase.google.com";

app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);
  return next();
});

app.use(cors({
  credentials: true,
  origin: 'https://tomerpacific.github.io'
}));

app.get('/firebase', function (req, res) {
 
  if (enoughDaysHavePassed()) {
      rp(url)
    .then(function(html){
        let services = [];

        const $ = cheerio.load(html);

        let startAndEndDates = getStartAndEndDates($);

        populateServicesWithStatus($, services);
        console.log(services);

        lastDateScraped = new Date();
        res.status(200).json({ message: services});
    })
    .catch(function(err){
      res.status(404).json({ message: err});
    });
  } else {
    res.status(200).json({ message: products});
  }
});

function getStartAndEndDates($) {
  
  let headers = $('.date-header');
  let headersLength = headers.length;
  let firstHeader = headers[0];
  let endHeader = headers[headersLength - 1];
  let startDate = firstHeader.children[0].data;
  let endDate = endHeader.children[0].data;

  return {'startDate': startDate, 'endDate': endDate};

}

function populateServicesWithStatus($, services) {
  let serviceNames = $('.product-name');
  let amountOfServices = serviceNames.length;
  for(let i = 0; i < amountOfServices; i++) {
    let serviceName = serviceNames[i].children[0].data;
    services[serviceName.trim()] = '';
  }
}

function enoughDaysHavePassed() {
  
  if (!lastDateScraped) {
    return true;
  }
  
  let timeDifference = new Date().getTime() - lastDateScraped.getTime();
  let dayDifference = Math.floor(timeDifference / 1000*60*60*24);

  return dayDifference > daysPassedToScrapeAgain;
}

app.listen(port, function () {
 console.log('FirebaseScraperServer is listening on port ' + port);
});