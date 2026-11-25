// Creates the expense tables. startupMigrations.js requires this file at server start.
const { ExpenseCategory, ExpenseEntry, ExpenseRecurring } = require("./expense.models");

async function ensureExpenseSchema() {
  for (const model of [ExpenseCategory, ExpenseEntry, ExpenseRecurring]) await model.sync();
}

module.exports = { ensureExpenseSchema };