const legoData = require("./modules/legoSets");
const authData = require('./modules/auth-service');
const path = require("path");
const clientSessions = require("client-sessions");
const mongoose = require("mongoose");
const express = require('express');
const app = express();

const HTTP_PORT = process.env.PORT || 8080;

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("Connected to MongoDB");
    })
    .catch((err) => {
        console.log(`Failed to connect to MongoDB: ${err}`);
    });

app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(clientSessions({
  cookieName: "session",
  secret: "web322_assignment6",
  duration: 24 * 60 * 60 * 1000,
  activeDuration: 1000 * 60 * 5
}));

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

app.get('/', (req, res) => {
  res.render("home")
});

app.get('/about', (req, res) => {
  res.render("about");
});

app.get("/lego/sets", async (req, res) => {
  let sets = [];
  try {
    if (req.query.theme) {
      sets = await legoData.getSetsByTheme(req.query.theme);
    } else {
      sets = await legoData.getAllSets();
    }
    res.render("sets", { sets });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

app.get("/lego/sets/:num", async (req, res) => {
  try {
    let set = await legoData.getSetByNum(req.params.num);
    res.render("set", { set });
  } catch (err) {
    res.status(404).render("404", { message: err });
  }
});

app.get('/lego/addSet', ensureLogin, (req, res) => {
  legoData.getAllThemes().then(themeData => {
    res.render('addSet', { themes: themeData });
  }).catch(err => {
    res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
  });
});

app.post('/lego/addSet', ensureLogin, (req, res) => {
  legoData.addSet(req.body).then(() => {
    res.redirect('/lego/sets');
  }).catch(err => {
    res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
  });
});

app.get('/lego/editSet/:num', ensureLogin, (req, res) => {
  let setNum = req.params.num;
  Promise.all([legoData.getSetByNum(setNum), legoData.getAllThemes()]).then(([setData, themeData]) => {
    res.render('editSet', { set: setData, themes: themeData });
  }).catch(err => {
    res.status(404).render('404', { message: err });
  });
});

app.post('/lego/editSet', ensureLogin, (req, res) => {
  legoData.editSet(req.body.set_num, req.body).then(() => {
    res.redirect('/lego/sets');
  }).catch(err => {
    res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
  });
});

app.get('/lego/deleteSet/:num', ensureLogin, (req, res) => {
  let setNum = req.params.num;
  legoData.deleteSet(setNum).then(() => {
    res.redirect('/lego/sets');
  }).catch(err => {
    res.status(500).render('500', { message: `I'm sorry, but we have encountered the following error: ${err}` });
  });
});

app.get("/login", (req, res) => {
  res.render("login", { errorMessage: "", userName: "" });
});

app.get("/register", (req, res) => {
  res.render("register", { errorMessage: "", userName: "", successMessage: "" });
});

app.post("/register", (req, res) => {
  authData.registerUser(req.body).then(() => {
    res.redirect("/login");
  }).catch(err => {
    res.render("register", { errorMessage: err, userName: req.body.userName, successMessage: "" });
  });
});

app.post("/login", (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  authData.checkUser(req.body).then((user) => {
    req.session.user = {
      userName: user.userName,
      email: user.email,
      loginHistory: user.loginHistory
    };
    res.redirect('/lego/sets');
  }).catch(err => {
    res.render("login", { errorMessage: err, userName: req.body.userName });
  });
});

app.get("/logout", (req, res) => {
  req.session.reset();
  res.redirect("/");
});

app.get("/userHistory", ensureLogin, (req, res) => {
  res.render("userHistory", { user: req.session.user });
});

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

legoData.initialize().then(() => {
  app.listen(HTTP_PORT, () => { console.log(`server listening on: ${HTTP_PORT}`) });
}).catch(err => {
  console.log(`unable to start server: ${err}`);
});
