const yesno = require("yesno");

async function confirm(text) {
  const response = await yesno({
    question: text
  });
  return response;
}

module.exports = { confirm }