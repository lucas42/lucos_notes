const express = require('express');
const app = express();
const port = process.env.PORT || 8004;

app.use(express.static(__dirname + '/static', {extensions: ['json']}));

app.engine('mustache', require('mustache-express')());
app.set('view engine', 'mustache');
app.set('views', `${__dirname}/views`);

app.get('/', async (req, res) => {
  res.render("index", {
    lists: [
      {slug:"groceries", name: "Grocery Shopping"},
      {slug:"projects", name: "Projects"},
      {slug:"ceol", name: "Ceol"},
    ]
  });
});
app.listen(port, function () {
	console.log('App listening on port ' + port);
});