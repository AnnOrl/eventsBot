import fs from "fs";
import pkg from "lodash";

const { isEmpty, set, sortBy } = pkg;

import moment from "moment";
moment.locale("ru");

const isSameOrBetween = ({ target, prop, date, dateStart, dateEnd }) => {
  if (!dateStart || dateEnd === dateStart) {
    return moment(date).isSame(target, prop);
  }
  if (!dateEnd) {
    return moment(new Date(dateStart + "-" + target.year())).isSame(
      target,
      prop
    );
  }

  const start = moment(new Date(dateStart + "-" + target.year()));
  const end = moment(new Date(dateEnd + "-" + target.year()));
  return target.isSameOrBefore(end, prop) && target.isSameOrAfter(start, prop);
};

const isTodayEvent = ({ date, dateStart, dateEnd }) => {
  const today = moment();

  return isSameOrBetween({
    date,
    dateStart,
    dateEnd,
    target: today,
    prop: "day",
  });
};
const isThisWeekEvent = ({ date, dateStart, dateEnd }) => {
  const today = moment();

  // return moment(date).isSame(today, "week");
  return isSameOrBetween({
    date,
    dateStart,
    dateEnd,
    target: today,
    prop: "week",
  });
};
const isNextWeekEvent = ({ date, dateStart, dateEnd }) => {
  const nextWeek = moment().add(1, "week");

  // return moment(date).isSame(nextWeek, "week");
  return isSameOrBetween({
    date,
    dateStart,
    dateEnd,
    target: nextWeek,
    prop: "week",
  });
};
const isTomorrowEvent = ({ date, dateStart, dateEnd }) => {
  const tomorrow = moment().add(1, "d");

  // return moment(date).isSame(tomorrow, "day");
  return isSameOrBetween({
    date,
    dateStart,
    dateEnd,
    target: tomorrow,
    prop: "day",
  });
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
    if (
      filterFn({
        date: event.date,
        dateStart: event.dateStart,
        dateEnd: event.dateEnd,
      })
    ) {
      let formatDate = moment(event.date).format("D MMMM, dddd");
      const formatTime = moment(event.date).format("HH:mm");

      if (
        event.dateEnd &&
        event.dateStart &&
        event.dateEnd !== event.dateStart
      ) {
        formatDate = event.textDate;
      }

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
          const { message_id, name, timeEvent } =
            eventsByDate[date][time][href];

          eventsLinks =
            eventsLinks +
            "▪️ " +
            (timeEvent ? timeEvent + " - " : "") +
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

const monthNames = {
  января: "01",
  февраля: "02",
  марта: "03",
  апреля: "04",
  мая: "05",
  июня: "06",
  июля: "07",
  августа: "08",
  сентября: "09",
  октября: "10",
  ноября: "11",
  декабря: "12",
  январь: "01",
  февраль: "02",
  март: "03",
  апрель: "04",
  май: "05",
  июнь: "06",
  июль: "07",
  август: "08",
  сентябрь: "09",
  октябрь: "10",
  ноябрь: "11",
  декабрь: "12",
};

// Function to get the declension for the month
function getMonthDeclension(month) {
  const declensions = [
    "января",
    "февраля",
    "марта",
    "апреля",
    "мая",
    "июня",
    "июля",
    "августа",
    "сентября",
    "октября",
    "ноября",
    "декабря",
  ];
  const numericMonthIndex = parseInt(month, 10) - 1;
  return declensions[numericMonthIndex];
}

function extractDateAndTimeAfisha(dateString) {
  const dateRegex = /(\d{1,2})(?:\s*|[a-zа-яё]{1,}\s+)([а-яё]+)/gi;
  const timeRegex = /\d{1,2}:\d{2}/;

  const dates = dateString.match(dateRegex);
  const times = dateString.match(timeRegex);

  if (dates) {
    const dateStart = dates[0];
    const dateEnd = dates[1] || dateStart; // Если нет даты окончания, считаем её равной дате начала
    const [h, m] = times ? times[0].split(":") : [null, null];

    // Проверяем, есть ли совпадения для дат и месяцев перед деструктурированием
    const startMatches = dateStart.match(/(\d{1,2})|([а-яё]+)/gi) || [];
    const endMatches = dateEnd.match(/(\d{1,2})|([а-яё]+)/gi) || [];

    const [startDay, startMonth] = startMatches;
    const [endDay, endMonth] = endMatches;

    // Проверяем существование startMonth и endMonth перед использованием toLowerCase()
    const normalizedDateStart = startMonth
      ? `${monthNames[startMonth.toLowerCase()]}-${startDay.padStart(
          2,
          "0"
        )}`.toLowerCase()
      : "";
    const normalizedDateEnd = endMonth
      ? `${monthNames[endMonth.toLowerCase()]}-${
          endDay ? endDay.padStart(2, "0") : ""
        }`.toLowerCase()
      : "";

    // Текстовое представление диапазона дат
    const textDate =
      endDay && startDay !== endDay
        ? `${startDay}-${endDay} ${endMonth.toLowerCase()}`
        : `${startDay} ${startMonth.toLowerCase()}`;

    return {
      dateStart: normalizedDateStart,
      dateEnd: normalizedDateEnd,
      hEvent: h || "",
      mEvent: m || "",
      timeEvent: h && m ? h + ":" + m : "",
      textDate,
    };
  }

  return null;
}

function extractDateAndTimeITickets(inputString) {
  const dateRegex = /(\d{1,2})(?:\s*–\s*(\d{1,2}))?\s+([a-zа-яё]+)/gi;
  const timeRegex = /\d{1,2}:\d{2}/;

  const dateMatches = Array.from(inputString.matchAll(dateRegex));
  const timeMatch = inputString.match(timeRegex);

  let result = null;

  for (const dateMatch of dateMatches) {
    const dayStart = dateMatch[1];
    const dayEnd = dateMatch[2] || dayStart;
    const month = dateMatch[3];
    const h = timeMatch ? timeMatch[0].split(":")[0] : "";
    const m = timeMatch ? timeMatch[0].split(":")[1] : "";

    const numericMonth = monthNames[month.toLowerCase()];
    const dateStart = `${numericMonth}-${dayStart.padStart(2, "0")}`;
    const dateEnd = `${numericMonth}-${dayEnd.padStart(2, "0")}`;

    const textDate = `${dayStart}${
      dayStart !== dayEnd ? `-${dayEnd}` : ""
    } ${getMonthDeclension(numericMonth)}`;

    result = {
      dateStart,
      dateEnd,
      textDate,
      hEvent: h || "",
      mEvent: m || "",
      timeEvent: h && m ? h + ":" + m : "",
    };
  }

  return result;
}

function extractDateAndTimeLifetickets(inputString) {
  // Regular expression to extract date and time from the input string
  const regex = /\s*(\d{2})\.(\d{2})\.(\d{4}),\s*(\d{2}):(\d{2})\s*/;
  const match = inputString.match(regex);

  if (!match) {
    return null; // Return null if the input string doesn't match the expected format
  }

  const [, day, month, year, h, m] = match;
  const formattedDate = `${month}-${day}`;
  const textDate = `${day} ${getMonthDeclension(month)}`;

  return {
    dateStart: formattedDate,
    dateEnd: "",
    textDate,
    hEvent: h || "",
    mEvent: m || "",
    timeEvent: h && m ? h + ":" + m : "",
  };
}

function extractDateAndTimeTravel(inputString) {
  // Паттерн для поиска даты и времени
  const datePattern = /(\d{1,2})(-)?(\d{1,2})?([а-яё]+)/i;

  // Используем регулярное выражение для извлечения значений
  const match = inputString.match(datePattern);

  if (!match) {
    return null; // Если не найдено совпадений, возвращаем null
  }

  let dateStart = match[1].padStart(2, "0"); // Форматируем число начала даты (добавляем 0 в начало, если однозначное)
  let dateEnd = match[3] ? match[3].padStart(2, "0") : ""; // Форматируем число конца даты, если оно есть
  const month = match[4]; // Месяц

  // Определяем номер месяца по его названию, используя объект monthNames
  const monthNumber = monthNames[month.toLowerCase()];

  if (!monthNumber) {
    return null; // Если месяц не найден в списке, возвращаем null
  }

  // Формируем текстовую дату
  const textDate = `${dateStart}${dateEnd ? "-" + dateEnd : ""} ${month}`;

  // Формируем объект с результатами
  const result = {
    dateStart: `${monthNumber}-${dateStart}`,
    dateEnd: dateEnd ? `${monthNumber}-${dateEnd}` : "",
    textDate: textDate,
  };

  return result;
}

const getSameName = (name, savedEvents) => {
  let sameName = null;

  for (let k = 0; k < Object.keys(savedEvents).length; k++) {
    const name1 = name.replaceAll(" ", "").toLowerCase();
    const name2 = savedEvents[Object.keys(savedEvents)[k]]?.name
      .replaceAll(" ", "")
      .toLowerCase();

    if (name1 === name2 || similarity(name1, name2) > 0.4) {
      sameName = savedEvents[Object.keys(savedEvents)[k]].message_id;
      break;
    }
  }

  return sameName;
};

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from(Array(m + 1), () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

const similarity = (string1, string2) =>
  1 -
  levenshteinDistance(string1, string2) /
    Math.max(string1.length, string2.length);

export {
  getSameName,
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
  extractDateAndTimeAfisha,
  extractDateAndTimeITickets,
  extractDateAndTimeLifetickets,
  extractDateAndTimeTravel,
  wait,
  similarity,
};
