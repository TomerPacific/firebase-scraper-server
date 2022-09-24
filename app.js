var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
const rp = require('request-promise');
const cheerio = require('cheerio');

const daysPassedToScrapeAgain = 1;
var port = process.env.PORT || 3000;
var app = express();
var lastDateScraped;
var services = [];

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

        const $ = cheerio.load(html);

        let startAndEndDates = getStartAndEndDates($);

        populateServicesWithStatus($);

        lastDateScraped = new Date();
        return res.status(200).json({ message: services });
    })
    .catch(function(err){
      return res.status(404).json({message: err});
    });
 } else {
   res.status(200).json({ message: services});
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

function populateServicesWithStatus($) {
  let products = $('.product-row');
  for (var product of products) {
    let productName;
    let productStatus;
      for (var child of product.children) {
        if (child.attribs) {
          let attributes = child.attribs;
          if (attributes.class === 'product-name') {
            productName = child.children[0].data.trim();
          } else if (attributes.class === 'product-day') {
            let children = child.children;
            let marker = children[children.length - 2];
            if (marker && marker.attribs) {
               if (marker.attribs.class === 'status-container end-marker') {
                let markerClass = marker.children[1].attribs.class;
                if (markerClass.includes("available")) {
                  productStatus = "Available";
                }
              }
            }
          }
        }
      }

    
      services[productName] = productStatus;
      productName = "";
      productStatus = "";
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