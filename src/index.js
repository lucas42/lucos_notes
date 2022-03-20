import express from 'express';
import mustacheExpress from 'mustache-express';
const app = express();
const port = process.env.PORT || 8004;
import * as state from './state.js';

app.use(express.static('./static', {extensions: ['json']}));

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', `./views`);

app.get('/', (req, res) => {
	res.redirect("/todo/");
});
app.get('/todo', async (req, res) => {
	res.render("index", {
		lists: [
			{slug:"groceries", name: "Grocery Shopping"},
			{slug:"projects", name: "Projects"},
			{slug:"ceol", name: "Ceol"},
		]
	});
});
app.get('/todo/:slug', async (req, res) => {
	res.render("list", {
		name: "static list",
	});
});

app.get('/_info', async (req,res) => {

	const info = {
		system: 'lucos_notes',
		checks: {
			"data-file": await state.getInfoCheck(),
		},
		metrics: {},
		ci: {
			circle: "gh/lucas42/lucos_notes",
		}
	};
	res.json(info);
});
app.listen(port, function () {
	console.log('App listening on port ' + port);
});