const express = require('express')
// const morgan = require('morgan');
const bodyParser = require('body-parser');
const app = express();


// app.use(morgan('dev')); 
app.use(bodyParser.urlencoded({ extended:false }));
app.use(bodyParser.json()); 

require('./routes/webhook_verify')(app);

app.listen(9001, function() {
  console.log('Application running on port: 9001');
});