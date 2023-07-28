import fs from "fs";
import pkg from "lodash";

const { isEmpty, set, sortBy } = pkg;

import moment from "moment";
moment.locale("ru");

const isTodayEvent = (date) => {
  const today = moment();

  return moment(date).isSame(today, "day");
};
const isThisWeekEvent = (date) => {
  const today = moment();

  return moment(date).isSame(today, "week");
};
const isNextWeekEvent = (date) => {
  const nextWeek = moment().add(1, "week");

  return moment(date).isSame(nextWeek, "week");
};
const isTomorrowEvent = (date) => {
  const tomorrow = moment().add(1, "d");

  return moment(date).isSame(tomorrow, "day");
};

const readFile = (filePath) => {
  const file = JSON.parse(fs.readFileSync(filePath));

  return file;
};

const writeActualFile = (filePath, setPath, value) => {
  const currentFile = readFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(set(currentFile, setPath, value)));
};
const writeFile = (filePath, value) => {
  fs.writeFileSync(filePath, JSON.stringify(value));
};

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //Максимум не включается, минимум включается
}

function waitOneHour() {
  console.log("Подождем 1 час");
  const oneHourInMilliseconds = 60 * 60 * 1000;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
      console.log("час прошел");
    }, oneHourInMilliseconds);
  });
}
function waitOneMinute() {
  console.log("Подождем 1 минуту");
  const oneHourInMilliseconds = 60 * 1 * 1000;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
      console.log("Минута прошел");
    }, oneHourInMilliseconds);
  });
}
function wait(time = 3000) {
  //30s
  console.log("Подождем " + time);

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
      console.log(time + " прошел");
    }, time);
  });
}

const filterEvents = (filterFn) => {
  const { events } = readFile("data/events.json");
  const sortedEvents = sortBy(events, "date");

  let filteredEvents = {};

  sortedEvents.forEach((event) => {
    if (filterFn(event.date)) {
      const formatDate = moment(event.date).format("D MMMM, dddd");
      const formatTime = moment(event.date).format("HH:mm");

      set(filteredEvents, [formatDate, formatTime, event.linkHref], event);
    }
  });

  return filteredEvents;
};

const getEventsText = (eventsByDate, filterName) => {
  let text = `Событий на ${filterName} не найдено.`;
  if (!isEmpty(eventsByDate)) {
    let eventsLinks = "";

    Object.keys(eventsByDate).forEach((date) => {
      eventsLinks = eventsLinks + date + ": \n";
      Object.keys(eventsByDate[date]).forEach((time) => {
        Object.keys(eventsByDate[date][time]).forEach((href) => {
          const { message_id, name } = eventsByDate[date][time][href];

          eventsLinks =
            eventsLinks +
            "▪️ " +
            time +
            " - " +
            '<a href="' +
            (message_id ? "https://t.me/events_chisinau/" + message_id : href) +
            '">' +
            name +
            "</a>" +
            "\n";
        });
      });
      eventsLinks = eventsLinks + "\n";
    });

    text = `📅 Календарь событий на ${filterName}\n\n` + eventsLinks;
  }

  return { isFound: !isEmpty(eventsByDate), text };
};

export {
  writeActualFile,
  readFile,
  writeFile,
  getRandomInt,
  waitOneHour,
  getEventsText,
  isTodayEvent,
  isThisWeekEvent,
  isNextWeekEvent,
  isTomorrowEvent,
  filterEvents,
  waitOneMinute,
  wait,
};
