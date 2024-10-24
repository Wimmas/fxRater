const express = require('express');
var dotenv = require("dotenv");
var cors = require("cors");
const sql = require("mssql");
const fetch = require('node-fetch');

const app = express ();

dotenv.config();

app.use(express.json());
app.use(cors());
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-origin", "*")
  res.setHeader('Access-Control-Allow-Methods', "GET,POST,OPTIONS")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next();
})

const PORT = process.env.PORT || 3000;

// SQL Server configuration
var config = {
  "user": process.env.DB_USER, // Database username
  "password": process.env.DB_PASSWORD, // Database password
  "server": process.env.DB_HOST, // Server IP address
  "database": process.env.DB_DATABASE, // Database name
  "options": {
      "encrypt": false, // Disable encryption
      "trustServerCertificate": true
  }
}
// Connect to SQL Server
sql.connect(config, err => {
  if (err) {
      throw err;
  }
  console.log("Connection Successful!");
});

app.get('/', (req, res) => {
    try {
        return res.status(200).json({
          message: " Welcome to Simple Test API",
        });
      } catch (error) {
        return res.status(500).json({
          message: "Internal Server Error",
        });
      }
});

app.get('/api/symbols', (req, res) => {
    try {
      let settings = { method: "Get" };

      fetch(process.env.SYMBOLS_URL, settings)
          .then(res => res.json())
          .then(async (json) => {

            try{
              table = new sql.Table("Symbols");
              table.create = true;
              table.columns.add("Name", sql.VarChar, { length: 255, nullable: false });
              table.columns.add("Symbol", sql.VarChar, { length: 255, nullable: false });
              table.columns.add("Decimal", sql.Int, { nullable: true });
  
              json.response.forEach(element => {
                table.rows.add(element.name, element.symbol, parseInt(element.decimal));
              });
  
              await new sql.Request().bulk(table);
  
              return res.status(200).json({
                message: json,
              });
            }
            catch(error){
              return res.status(500).json({
                message: "Internal Server Error",
              });
            }
          });
    
        
      } catch (error) {
        return res.status(500).json({
          message: "Internal Server Error",
        });
      }
});

app.get('/api/prices', async (req, res) => {
    try {
      let settings = { method: "Get" };

      fetch(process.env.PRICES_URL, settings)
          .then(res => res.json())
          .then(async (json) => {

            try{
              table = new sql.Table("Prices");
              table.create = true;
              table.columns.add("Symbol", sql.VarChar, { length: 255, nullable: false });
              table.columns.add("Price", sql.Float, { nullable: false });
              table.columns.add("PriceDate", sql.Date, { nullable: false });
  
              json.response.forEach(element => {
                table.rows.add(element.s.trim(), parseFloat(element.c), new Date(element.tm));
              });
  
              await new sql.Request().bulk(table);
  
              return res.status(200).json({
                message: json,
              });
            }
            catch(error){
              return res.status(500).json({
                message: "Internal Server Error",
              });
            }
          });
  
      
    } catch (error) {
      return res.status(500).json({
        message: "Internal Server Error",
      });
    }
});

app.get('/fxRater/symbols', async (req, res) => {
    try {  
      sql.query('SELECT Name, Symbol FROM Symbols', (err, result) =>{
        if(err){
          return res.status(500).json({
            message: "Internal Server Error",
          });
        }

        json = JSON.stringify(result.recordsets);

        return res.status(200).json({
          message: "Successfully retrieved data",
          symbols: json
        });
      });
    } catch (error) {
      return res.status(500).json({
        message: "Internal Server Error",
      });
    }
});

app.post('/fxRater/curPrice', async (req, res) => {
    try {  
      let { symbol, amount, date } = req.body;
      
      let query = 'SELECT Price FROM Prices WHERE Symbol = \'' + symbol + '\' AND PriceDate = \'' + date + '\'';
      sql.query(query, (err, result) =>{
        if(err){
          return res.status(500).json({
            message: "Internal Server Error",
          });
        }

        var price = parseFloat(result.recordset.at(0).Price);
        var total = price * parseFloat(amount);

        return res.status(200).json({
          message: "Successfully retrieved exchange rate price",
          price: total
        });
      });
    } catch (error) {
      return res.status(500).json({
        message: "Internal Server Error",
      });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});