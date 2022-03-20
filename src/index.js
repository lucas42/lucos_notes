import express from 'express';
import mustacheExpress from 'mustache-express';
const app = express();
const port = process.env.PORT || 8004;
import state, {getInfoCheck} from './statefs.js';

app.use(express.static('./static', {extensions: ['json']}));

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', `./views`);

app.get('/', (req, res) => {
	res.redirect("/todo/");
});
app.get('/todo', async (req, res, next) => {
	try {
		res.render("index", await state.getLists());
	} catch (err) {
		next(err);
	}
});
app.get('/todo/:slug', async (req, res, next) => {
	try {
		res.render("list", await state.getList(req.params.slug));
	} catch (err) {
		next(err);
	}
});
app.get('/todo.json', async (req,res, next) => {
	try {
		res
			.setHeader("Content-Type", "application/json")
			.send(await state.getRawData());
	} catch (err) {
		next(err);
	}
});

app.get('/_info', async (req,res) => {

	const info = {
		system: 'lucos_notes',
		checks: {
			"data-file": await getInfoCheck(),
		},
		metrics: {},
		ci: {
			circle: "gh/lucas42/lucos_notes",
		}
	};
	res.json(info);
});

// Error Handler
app.use((error, req, res, next) => {

	// "Can't find" errors should 404 and not log
	if(error.message.startsWith("Can't find")) {
		res.status(404);
	} else {
		console.error(error.stack);
		res.status(500);
	}
	res.render("error", {message: error.message});
});

app.listen(port, function () {
	console.log('App listening on port ' + port);
});