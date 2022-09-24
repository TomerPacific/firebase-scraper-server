var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
const rp = require('request-promise');
const cheerio = require('cheerio');


const daysPassedToScrapeAgain = 1;
const amountOfColumns = 8;
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
       let products = [];
       let product = {};

       const $ = cheerio.load(html);

       let startAndEndDates = getStartAndEndDates($);

        let services = cheerio.load('.service-status', html);
        for (let i = 0; i < services.length; i++) {
          let service = services[i].children[0].data.trim();
          if (service === 'Cloud Firestore') {
            continue;
          }

          product.name = service;
          product.incidents = [];
          products.push(product);
          product = {};
        }

      populateIncidents(html, products, currentStartDate);

      let statuses = cheerio.load('.end-bubble', html);
      for (let i = 0; i < products.length; i++) {
        var productStatus = statuses[i];
        if (productStatus && productStatus.attribs) {
          products[i].status = productStatus.attribs.class;
        }
      }

      lastDateScraped = new Date();
      res.status(200).json({ message: products});
    })
    .catch(function(err){
      console.log(err);
    });
  } else {
    res.status(200).json({ message: products});
  }
});

function populateIncidents(html, products, currentStartDate) {
  
  for(let i = 1; i < amountOfColumns; i++) {
         let dayColumn = cheerio.load('.day.col'+i, html);
          for(let j = 0; j < dayColumn.length; j++) {
            let children = dayColumn[j].children;
            let incidentReportIndex = findAnchorTag(children);
            if (incidentReportIndex !== -1) {
              let incidentReport = children[incidentReportIndex];
              let incident = {};
              incident.day = parseInt(currentStartDate.startDate) + i - 1;
              incident.link = incidentReport.attribs.href;
              products[incidentReportIndex].incidents.push(incident);
              incident = {};
            }
          }
      }
}


function getStartAndEndDates($) {
  
  let headers = $('.date-header');
  let headersLength = headers.length;
  let firstHeader = headers[0];
  let endHeader = headers[headersLength - 1];
  let startDate = firstHeader.children[0].data;
  let endDate = endHeader.children[0].data;

  return {'startDate': startDate, 'endDate': endDate};

}


function findAnchorTag(elements) {
  for(let i = 0; i < elements.length; i++) {
    if (elements[i].name === 'a') {
      return i;
    }
  }

  return -1;
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
 console.log('Example app listening on port ' + port);
});