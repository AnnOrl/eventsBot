import createError from "http-errors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cookieParser from "cookie-parser";
import logger from "morgan";

import { getUpdates } from "./js/tgGetUpdates.js";
import { getEvents, getTodayEvents, getTodayFilms } from "./js/events/getEvents.js";

var app = express();

const __filename = fileURLToPath(import.meta.url);

const __dirname = path.dirname(__filename);

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// app.use('/', indexRouter);
// app.use('/'+config.telegram.token, tokenRouter);

getUpdates();
setInterval(getUpdates, 6000);

getTodayEvents();
getTodayFilms();

getEvents();

setInterval(getEvents, 21600000); //6h
setInterval(getTodayEvents, 3600000); //1h
setInterval(getTodayFilms, 21600000); //6h

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

export default app;
