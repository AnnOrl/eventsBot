import axios from "axios";
import fs from "fs";
import moment from "moment";
import FormData from "form-data";
moment.locale("ru");

import jsdom from "jsdom";
const { JSDOM } = jsdom;
import config from "../../config.json" assert { type: "json" };
import pkg from 'lodash';
const { isEqual, isEmpty } = pkg;

import {
  createImageCollage, readFile, writeActualFile,
} from "../utils.js";
import { deleteMessage, sendFD, sendMessage, sendPhoto } from "../tgApi.js";

const getFilms = async (data, checkEqual = true) => {
  try {


    const {
      filmsLinksNow = [],
      filmsLinksNew = [],
    } = readFile("data/check.json");

    console.log(
      "\nПоиск фильмов"
    );

    let filmsNow = [];
    let filmsNew = [];
    let imageLinksNow = [];
    let imageLinksNew = [];

    for (let i = 0; i < data.length; i++) {
      const link = data[i].link;
      const img = data[i].poster;
      const name = data[i].title_ru;
      const lang = data[i].language;
      const genre = data[i].genre_ru;
      const date = data[i].release_date;
      const trailer = data[i].trailer;

      const startdate = moment(date)

      if (moment().isAfter(startdate)) {
        const sameFilm = filmsNow.findIndex((el) => el.name === name)
        if (sameFilm === -1) {
          imageLinksNow.push(img);
          filmsNow.push({ link: [link], img, name, lang: [lang], genre, startdate, trailer });
        } else {
          filmsNow[sameFilm].lang = [...filmsNow[sameFilm].lang, lang]
          filmsNow[sameFilm].link = [...filmsNow[sameFilm].link, link]
        }
      } else if (moment().add(14, 'days').isAfter(startdate)) {
        const sameFilm = filmsNew.findIndex((el) => el.name === name)
        if (sameFilm === -1) {
          imageLinksNew.push(img);
          filmsNew.push({ link: [link], img, name, lang: [lang], genre, startdate, trailer });
        } else {
          filmsNew[sameFilm].lang = [...filmsNew[sameFilm].lang, lang]
          filmsNew[sameFilm].link = [...filmsNew[sameFilm].link, link]
        }
      }
    }

    // const dom = new JSDOM(data);
    // const filmsList = dom.window.document.querySelectorAll('.movies_blcks');
    // let filmsNow = [];
    // let filmsNew = [];
    // let imageLinksNow = [];
    // let imageLinksNew = [];

    // for (let i = 0; i < filmsList.length; i++) {
    //   const link = filmsList[i].querySelector('div').getAttribute('data-href');
    //   const img = filmsList[i].querySelector('img').src;
    //   const name = filmsList[i].querySelector('.overlay__title').innerHTML.replace('\n', ' ');
    //   const lang = filmsList[i].querySelector('.overlay__lang').innerHTML.replace('\n', '');
    //   const genre = filmsList[i].querySelector('.overlay__genre').innerHTML.replace('\n', '');
    //   const matches = filmsList[i].querySelector('.startdate').innerHTML.replace(/[()]/g, '').match(/\d+/g);

    //   const startdate = moment(`${matches[2]}-${matches[1]}-${matches[0]}`)

    //   if (filmsList[i].getAttribute('data-time') === 'now') {
    //     const sameFilm = filmsNow.findIndex((el) => el.name === name)
    //     if (sameFilm === -1) {
    //       imageLinksNow.push(img);
    //       filmsNow.push({ link: [link], img, name, lang: [lang], genre, startdate });
    //     } else {
    //       filmsNow[sameFilm].lang = [...filmsNow[sameFilm].lang, lang]
    //       filmsNow[sameFilm].link = [...filmsNow[sameFilm].link, link]
    //     }
    //   } else if (moment().add(14, 'days').isAfter(startdate)) {
    //     const sameFilm = filmsNew.findIndex((el) => el.name === name)
    //     if (sameFilm === -1) {
    //       imageLinksNew.push(img);
    //       filmsNew.push({ link: [link], img, name, lang: [lang], genre, startdate });
    //     } else {
    //       filmsNew[sameFilm].lang = [...filmsNew[sameFilm].lang, lang]
    //       filmsNew[sameFilm].link = [...filmsNew[sameFilm].link, link]
    //     }
    //   }
    // }

    const sendMess = async (text, imageLinks, films) => {
      const collageBuffer = await createImageCollage(imageLinks);
      const filePath = 'public/images/collage.png'; // Путь к файлу на сервере

      // Записываем буфер изображения в файл
      fs.writeFileSync(filePath, collageBuffer);

      let readStream = fs.createReadStream(filePath);

      let form = new FormData();
      form.append("photo", readStream);

      const message = await sendFD(form, config.telegram.my_chat_id);

      let messageText = text + '\n\n';

      films.forEach((film) => {
        let filmEntries = '';

        film.link.forEach((link, index) => {
          filmEntries = filmEntries !== '' ? filmEntries + `, <a href="${link}">${film.lang[index]}</a>` : `<a href="${link}">${film.lang[index]}</a>`;
        });
        let dateStart = ''

        if (moment(film.startdate).isAfter(moment())) {
          dateStart = '\n 📅 C ' + moment(film.startdate).format('D MMMM');
        }

        messageText = messageText + `🎬 <b>${film.name}</b>\n<i>🎭 ${film.genre}</i>\n${film.trailer ? `🔗 <a href="${film.trailer}">Смотреть трейлер</a>\n` : ''}🗣️ ${filmEntries}${dateStart}\n\n`
      })


      const newM = await sendPhoto(message.photo[0].file_id, messageText, config.telegram.my_chat_id, [
        [{ text: "Опубликовать", callback_data: "publishFilmsNow" }],
        [{ text: "Удалить", callback_data: "delete" }],
      ]);

      await deleteMessage(config.telegram.my_chat_id, message.message_id);
    }

    const step = 6;

    if (imageLinksNow !== [] && (!checkEqual || !isEqual(filmsLinksNow, imageLinksNow))) {

      if (imageLinksNow.length > step) {
        for (let i = 0; i < imageLinksNow.length; i += step) {
          const arr = imageLinksNow.slice(i, i + step);
          !isEmpty(arr) && await sendMess('🍿 Сейчас в кино:', arr, filmsNow.slice(i, i + step))
        }
      } else {
        await sendMess('🍿 Сейчас в кино:', imageLinksNow, filmsNow)
      }
    }
    if (imageLinksNew !== [] && (!checkEqual || !isEqual(filmsLinksNew !== imageLinksNew))) {
      if (imageLinksNew.length > step) {

        for (let i = 0; i < imageLinksNew.length; i += step) {
          const arr = imageLinksNew.slice(i, i + step);
          !isEmpty(arr) && await sendMess('🎉 Скоро в кино:', arr, filmsNew.slice(i, i + step))
        }
      } else {
        await sendMess('🎉 Скоро в кино:', imageLinksNew, filmsNew)
      }
    }


    writeActualFile(
      "data/check.json",
      "filmsLinksNow",
      imageLinksNow
    );

    writeActualFile(
      "data/check.json",
      "filmsLinksNew",
      imageLinksNew
    );

  } catch (e) {
    if (e.message === "401") {
      throw e;
    }
    console.log("ERROR", e);
  }
};

export { getFilms };
