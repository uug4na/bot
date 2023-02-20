const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

require("./routes/webhook_verify")(app);

app.listen(process.env.PORT, function () {
  console.log("Application running on port: ", process.env.PORT);
});
