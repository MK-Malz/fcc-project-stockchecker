'use strict';

const fetch = require('node-fetch');
const mongoose = require("mongoose");
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


module.exports = function(app) {

  app.route('/api/stock-prices')
    .get(function(req, res) {

      if (req.query.like == false) {
        async function callApi(url) {
          const response = await fetch(url);
          const data = await response.json();
          return data;
        }

        if (Array.isArray(req.query.stock)) {
          const URL1 = URL_part1 + req.query.stock[0] + URL_part2
          const URL2 = URL_part1 + req.query.stock[1] + URL_part2

          const start = async function() {
            const result1 = await callApi(URL1);
            const result2 = await callApi(URL2)
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

          }

          start()

        } else {
          const URL = URL_part1 + req.query.stock + URL_part2

          const start = async function() {
            const result = await callApi(URL);
            let likes = 1

            res.json({
              "stockData":
              {
                "stock": req.query.stock,
                "price": result.latestPrice,
                "likes": likes
              }
            })

          }

          start()
        }
      } else if (Array.isArray(req.query.stock)) {

      } else {

      }











    })


};
