const dayjs = require("dayjs");

function daysBetween(date1, date2) {
  return dayjs(date2).diff(dayjs(date1), "day");
}

function isDateInPast(date) {
  return dayjs(date).isBefore(dayjs(), "day");
}

function addDays(date, days) {
  return dayjs(date).add(days, "day").toDate();
}

function formatDate(date, format = "DD MMM YYYY") {
  return dayjs(date).format(format);
}

function isWeekend(date) {
  const day = dayjs(date).day();
  return day === 0 || day === 6;
}

module.exports = { daysBetween, isDateInPast, addDays, formatDate, isWeekend };