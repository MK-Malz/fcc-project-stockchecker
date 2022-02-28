'use strict';

const fetch = require('node-fetch');
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const URL_part1 = "https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/"
const URL_part2 = "/quote"


mongoose.connect(process.env["MONGO_URI"], {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const { Schema } = mongoose;

const stockSchema = new Schema({
  stock: String,
  liked_by: [String]
});

let Stock = mongoose.model("stock", stockSchema);

const getStockPrice = (stockSymbol) => {
  return new Promise((resolve, reject) => {
    const url = URL_part1 + stockSymbol + URL_part2
    fetch(url).then(response => response.json()).then(data => {
      if (data === 'Unknown symbol') {
        reject("Unknown symbol: " + stockSymbol);
      } else if (data === 'Not found') {
        reject("Symbol not found: " + stockSymbol);
      } else {
        resolve({ 'stock': data['symbol'], 'price': data['latestPrice'] });
      }
    }).catch(error => reject(error));
  });
};

const getStockLikes = (stockSymbol, ipAddress = null, like = false) => {
  return new Promise((resolve, reject) => {
    if (like) {
      Stock.findOne({ stock: stockSymbol }, function(err, stockFound) {
        if (err) {
          console.log(err);
          reject(err.toString());
        }
        if (!stockFound) {
          // add with liek counter 1
          let stockObject = { stock: stockSymbol, liked_by: [ipAddress] };
          let newStock = new Stock(stockObject);
          newStock.save((err, stockCreated) => {
            if (err) {
              console.log(err);
              reject(err.toString());
            }
            resolve({
              stock: stockSymbol,
              likes: 1,
            });
          });

        } else {
          if (stockFound.liked_by.some(x => bcrypt.compareSync(ipAddress, x))) {
            resolve({ stock: stockSymbol, likes: stockFound.liked_by.length });
          } else {
            var hash = bcrypt.hashSync(ipAddress, 5);
            let updateObject = {
              liked_by: stockFound.liked_by.push(hash)
            };
            Stock.findOneAndUpdate(
              { stock: stockSymbol },
              updateObject,
              function(err, data) {
                if (err) {
                  console.log(err);
                  reject(err.toString());
                } else {
                  resolve({
                    stock: stockSymbol,
                    likes: stockFound.liked_by.length + 1,
                  });
                }
              }
            );
          }
        }
      });
    }
    else {
               Stock.findOne({ stock: stockSymbol }, function (err, stockFound) {
           if (err) {
             console.log(err);
             reject(err.toString());
           }
           if (!stockFound) {
                 resolve({
                   stock: stockSymbol,
                   likes: 0,
                 });    
           } else {           
                resolve({
                  stock: stockSymbol,
                  likes: stockFound.liked_by.length,
                });
             }
           }
         );
    }
  });
};

module.exports = function(app) {

  app.route('/api/stock-prices')
    .get(function(req, res) {


      if (req.query.hasOwnProperty('stock')) {
        const symbols = (typeof req.query['stock'] === 'string')
          ? [req.query['stock']]
          : req.query['stock'];
        if (symbols.length > 2) {
          res.json({ 'error': 'Max of two stock symbols allowed' });
        } else {
          const liked = req.query.hasOwnProperty('like');
          Promise.all(symbols.map(symbol => {
            return Promise.all(
              [getStockPrice(symbol.toUpperCase()), getStockLikes(symbol.toUpperCase(), req.ip, liked)]);
          })).then((results) => {
            const stockData = results.map(d => {
              return Object.assign(...d);
            });
            if (stockData.length === 1) {
              return res.json({ 'stockData': stockData[0] });
            } else {
              stockData[0]['rel_likes'] = stockData[0]['likes'] - stockData[1]['likes'];
              stockData[1]['rel_likes'] = stockData[1]['likes'] - stockData[0]['likes'];
              delete stockData[0]['likes'];
              delete stockData[1]['likes'];
              return res.json({ 'stockData': stockData });
            }
          }).catch(error => res.json({ 'error': error }));
        }
      } else {
        res.json({ 'error': 'No stock symbol provided' });
      }











      /*
      res.json({
        "stockData":
        {
          "stock": req.query.stock,
          "price": result.latestPrice,
          "likes": likes
        }
      })
      */




      /*
      res.json({
        "stockData": [
          {
            "stock": req.query.stock[0],
            "price": result1.latestPrice,
            "rel_likes": -1
          },
          {
            "stock": req.query.stock[1],
            "price": result2.latestPrice,
            "rel_likes": 1
          }]
      })
      */













    })


};
